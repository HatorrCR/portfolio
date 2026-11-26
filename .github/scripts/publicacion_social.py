"""Publish queued Instagram carousels, then their corresponding posts on X."""

import json
import os
from pathlib import Path
import subprocess
from urllib.request import Request, urlopen

QUEUE = Path(".github/publicacion-social.json")
CREATE = """
mutation Create($input: CreatePostInput!) {
  createPost(input: $input) {
    ... on PostActionSuccess { post { id } }
    ... on MutationError { message }
  }
}
"""
POSTS = """
query {
  posts(first: 30, input: {
    organizationId: ORGANIZATION,
    filter: {channelIds: [CHANNEL], status: [sent, error]}
  }) {
    edges { node { id status } }
  }
}
"""


def buffer(query, variables=None):
    token = os.environ.get("BUFFER_API_KEY")
    if not token:
        raise RuntimeError("Falta el secreto BUFFER_API_KEY.")
    request = Request(
        "https://api.buffer.com",
        data=json.dumps({"query": query, "variables": variables or {}}).encode(),
        headers={"Content-Type": "application/json", "Authorization": f"Bearer {token}"},
    )
    with urlopen(request, timeout=25) as response:
        result = json.load(response)
    if result.get("errors"):
        raise RuntimeError(f"Buffer devolvió errores: {result['errors']}")
    return result["data"]


def save(queue, message):
    QUEUE.write_text(json.dumps(queue, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    subprocess.run(["git", "add", str(QUEUE)], check=True)
    subprocess.run(
        ["git", "-c", "user.name=github-actions[bot]", "-c",
         "user.email=41898282+github-actions[bot]@users.noreply.github.com",
         "commit", "-m", message],
        check=True,
    )
    subprocess.run(["git", "push", "origin", "HEAD:main"], check=True)


def submit(queue, job, network, channel):
    data = job[network]
    assets = [{"image": {"url": url}} for url in data.get("imagenes", [])]
    post = {
        "channelId": channel,
        "text": data["texto"],
        "assets": assets,
        "mode": "shareNow",
        "schedulingType": "automatic",
    }
    # Persist the attempt before calling Buffer. A lost response must not cause a repost.
    data["estado"] = "enviando"
    save(queue, f"Registrar intento de publicación en {network}: {job['id']}")
    result = buffer(CREATE, {"input": post})["createPost"]
    if not result.get("post"):
        data["estado"] = "rechazado"
        save(queue, f"Registrar rechazo en {network}: {job['id']}")
        raise RuntimeError(result.get("message", "Buffer rechazó la publicación."))
    data["buffer_id"] = result["post"]["id"]
    data["estado"] = "enviado"
    save(queue, f"Guardar ID de Buffer para {network}: {job['id']}")


def delivered(channel):
    query = POSTS.replace("ORGANIZATION", json.dumps(os.environ["BUFFER_ORGANIZATION_ID"]))
    query = query.replace("CHANNEL", json.dumps(channel))
    return {edge["node"]["id"]: edge["node"]["status"] for edge in buffer(query)["posts"]["edges"]}


def main():
    queue = json.loads(QUEUE.read_text(encoding="utf-8"))
    instagram = os.environ["BUFFER_INSTAGRAM_CHANNEL_ID"]
    x = os.environ["BUFFER_X_CHANNEL_ID"]
    for job in queue:
        ig = job["instagram"]
        tweet = job["x"]
        if any(item.get("estado") == "enviando" for item in (ig, tweet)):
            raise RuntimeError(f"Comprueba en Buffer el intento de {job['id']} antes de reanudar.")
        if ig.get("estado") == "pendiente":
            submit(queue, job, "instagram", instagram)
        if ig.get("estado") == "enviado":
            status = delivered(instagram).get(ig["buffer_id"])
            if status in ("sent", "error"):
                ig["estado"] = "publicado" if status == "sent" else "fallido"
                save(queue, f"Actualizar estado de Instagram: {job['id']}")
        if ig.get("estado") == "publicado" and tweet.get("estado") == "pendiente":
            submit(queue, job, "x", x)
        if tweet.get("estado") == "enviado":
            status = delivered(x).get(tweet["buffer_id"])
            if status in ("sent", "error"):
                tweet["estado"] = "publicado" if status == "sent" else "fallido"
                save(queue, f"Actualizar estado de X: {job['id']}")
        if any(item.get("estado") in ("fallido", "rechazado") for item in (ig, tweet)):
            print(f"Revisar en Buffer la publicación {job['id']}.")


if __name__ == "__main__":
    main()
