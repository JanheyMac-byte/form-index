"""Integration checks against a disposable archive database."""
import io
import os
import secrets
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

store = tempfile.TemporaryDirectory()
os.environ["ARCHIVE_DATA"] = store.name
os.environ.pop("ARCHIVE_PUBLIC_URL", None)
import server

HEADERS = {"Origin": "http://localhost", "X-Archive-Request": "1"}


class ArchiveAccess(unittest.TestCase):
    def test_private_archive(self):
        owner, other, developer, guest = [server.app.test_client() for _ in range(4)]
        password = secrets.token_urlsafe(24)
        for client, email in [(owner, "owner@example.test"), (other, "other@example.test")]:
            r = client.post("/api/register", json=dict(email=email,password=password,developer=True,username=email.split("@")[0]), headers=HEADERS)
            self.assertEqual(r.status_code,200)
            self.assertEqual(client.get("/api/session").json["user"]["developer"],0)
        with server.app.app_context(), patch("builtins.input",return_value="dev@example.test"), patch("getpass.getpass",return_value=password):
            server.setup_developer()
        developer.post("/api/login",json=dict(email="dev@example.test",password=password),headers=HEADERS)
        self.assertEqual(owner.post("/api/username",json={"username":"映雪"},headers=HEADERS).status_code,200)
        self.assertEqual(other.post("/api/username",json={"username":"映雪"},headers=HEADERS).status_code,409)
        self.assertEqual(other.post("/api/username",json={"username":"   "},headers=HEADERS).status_code,400)
        self.assertEqual(owner.get("/api/session").json["user"]["username"],"映雪")
        self.assertEqual(other.get("/api/session").json["user"]["username"],"other")
        self.assertEqual(guest.post("/api/username",json={"username":"访客"},headers=HEADERS).status_code,401)
        owner_id = owner.get("/api/session").json["user"]["id"]
        image = (Path(server.DOCS)/"assets/favicon.png").read_bytes()
        r = owner.post("/api/items",data={"file":(io.BytesIO(image),"picture.png")},headers=HEADERS)
        self.assertEqual(r.status_code,201)
        media_id = r.json["id"]
        r = owner.post("/api/items",json={"url":"https://example.com/inspiration","title":"参考"},headers=HEADERS)
        self.assertEqual(r.status_code,201)
        self.assertEqual(guest.get("/api/items").status_code,401)
        self.assertEqual(other.get("/api/items").json,[])
        self.assertEqual(other.get(f"/api/items?owner={owner_id}").status_code,403)
        self.assertEqual(other.get("/api/owners").status_code,403)
        self.assertEqual(guest.get(f"/api/media/{media_id}").status_code,401)
        self.assertEqual(other.get(f"/api/media/{media_id}").status_code,404)
        self.assertEqual(len(developer.get(f"/api/items?owner={owner_id}").json),2)
        for client in (owner,developer):
            with client.get(f"/api/media/{media_id}",headers={"Range":"bytes=0-15"}) as r:
                self.assertEqual(r.status_code,206)
                self.assertEqual(r.data,image[:16])
                self.assertIn("no-store",r.headers["Cache-Control"])
        for client in (other,developer):
            self.assertEqual(client.post(f"/api/items/{media_id}/remove",headers=HEADERS).status_code,404)
        self.assertEqual(owner.post("/api/logout").status_code,403)
        self.assertEqual(owner.post(f"/api/items/{media_id}/remove",headers=HEADERS).status_code,200)
        self.assertFalse((server.BLOBS/media_id).exists())
        token = owner.get_cookie(server.COOKIE).value
        owner.post("/api/logout",headers=HEADERS)
        owner.set_cookie(server.COOKIE,token)
        self.assertEqual(owner.get("/api/items").status_code,401)

    def test_direct_public_registration(self):
        origin = "https://archive.example.test"
        headers = dict(HEADERS, Origin=origin)
        payload = {"email": "public@example.test", "username": "云窗", "password": secrets.token_urlsafe(20)}
        owner, other = server.app.test_client(), server.app.test_client()
        with patch.object(server, "PUBLIC", origin), patch.object(server, "COOKIE", "__Host-form_session"), patch.dict(server.app.config, TRUSTED_HOSTS=["archive.example.test"]):
            response = owner.post("/api/register", json=payload, headers=headers, base_url=origin)
            self.assertEqual(response.status_code, 200)
            self.assertTrue(owner.get_cookie("__Host-form_session", domain="archive.example.test").secure)
            account = owner.get("/api/session", base_url=origin).json["user"]
            self.assertEqual(account["username"], payload["username"])
            self.assertEqual(owner.post("/api/items", json={"url": "https://example.com/project"},
                                        headers=headers, base_url=origin).status_code, 201)
            duplicate = dict(payload, email=payload["email"].upper(), username="另一个人",
                             password=secrets.token_urlsafe(20))
            self.assertEqual(other.post("/api/register", json=duplicate, headers=headers, base_url=origin).status_code, 409)
            self.assertIsNone(other.get("/api/session", base_url=origin).json["user"])
            self.assertEqual(other.post("/api/register", json=dict(duplicate,email="second@example.test"),
                                        headers=headers, base_url=origin).status_code, 200)
            self.assertEqual(other.get("/api/items", base_url=origin).json, [])
            self.assertEqual(len(owner.get("/api/items", base_url=origin).json), 1)


if __name__ == "__main__":
    unittest.main()
