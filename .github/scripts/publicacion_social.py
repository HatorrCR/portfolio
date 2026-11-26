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
    edges { node { id status error { message } } }
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


def save(queue, message, asset=None):
    QUEUE.write_text(json.dumps(queue, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    files = [str(QUEUE)] + ([str(asset)] if asset is not None else [])
    subprocess.run(["git", "add", *files], check=True)
    identity = [
        "-c", "user.name=github-actions[bot]",
        "-c", "user.email=41898282+github-actions[bot]@users.noreply.github.com",
    ]
    subprocess.run(["git", *identity, "commit", "-m", message], check=True)
    for attempt in range(3):
        push = subprocess.run(
            ["git", "push", "origin", "HEAD:main"],
            capture_output=True, text=True,
        )
        if push.returncode == 0:
            return
        if attempt == 2 or not any(
            reason in push.stderr for reason in ("fetch first", "non-fast-forward")
        ):
            raise RuntimeError(f"No se pudo guardar el estado de publicación: {push.stderr.strip()}")
        subprocess.run(["git", "fetch", "origin", "main"], check=True)
        comparison = subprocess.run(
            ["git", "diff", "--quiet", "HEAD^", "FETCH_HEAD", "--", str(QUEUE)]
        )
        if comparison.returncode != 0:
            raise RuntimeError("La cola cambió durante la ejecución. Revisa el último intento en Buffer.")
        subprocess.run(["git", *identity, "rebase", "--onto", "FETCH_HEAD", "HEAD^"], check=True)


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
    if network == "instagram":
        post["metadata"] = {"instagram": {"type": "post", "shouldShareToFeed": True}}
    data["github_run_id"] = os.environ.get("GITHUB_RUN_ID")
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
    return {edge["node"]["id"]: edge["node"] for edge in buffer(query)["posts"]["edges"]}


def discover_channels():
    organizations = buffer("{ account { organizations { id } } }")["account"]["organizations"]
    matches = []
    for organization in organizations:
        organization_id = organization["id"]
        query = """{
          channels(input: {organizationId: ORGANIZATION}) {
            id name service type
          }
        }""".replace("ORGANIZATION", json.dumps(organization_id))
        channels = buffer(query)["channels"]
        instagram = [
            channel for channel in channels
            if channel["service"] == "instagram"
            and channel["name"].strip().lstrip("@").casefold() == "comosejuegagd"
            and channel["type"] != "profile"
        ]
        x = [channel for channel in channels if channel["service"] in ("twitter", "x")]
        if len(instagram) == 1 and len(x) == 1:
            matches.append((organization_id, instagram[0]["id"], x[0]["id"]))
    if len(matches) != 1:
        raise RuntimeError("Conecta @comosejuegagd y un único perfil de X en el mismo espacio de Buffer.")
    return matches[0]


def main():
    queue = json.loads(QUEUE.read_text(encoding="utf-8"))
    preview = os.environ.get("PREVIEW_FICHA") == "true"
    if preview or os.environ.get("PREPARAR_FICHA") == "true":
        from ficha_diaria import enqueue
        enqueue(queue, save, preview=preview)
    if not queue or all(
        job["x"].get("estado") == "publicado" for job in queue
    ):
        return
    organization, instagram, x = discover_channels()
    os.environ["BUFFER_ORGANIZATION_ID"] = organization
    for job in queue:
        if job.get("reedicion", 1) > 1 and any(
            earlier.get("reedicion", 0) and earlier["reedicion"] < job["reedicion"]
            and earlier["x"].get("estado") != "publicado" for earlier in queue
        ):
            continue
        ig = job["instagram"]
        tweet = job["x"]
        if any(item.get("estado") == "enviando" for item in (ig, tweet)):
            print(f"::warning::Comprueba en Buffer el intento de {job['id']} antes de reanudar.")
            continue
        if ig.get("estado") == "pendiente":
            submit(queue, job, "instagram", instagram)
        if ig.get("estado") == "enviado":
            post = delivered(instagram).get(ig["buffer_id"], {})
            status = post.get("status")
            if status == "error":
                ig["github_run_id"] = os.environ["GITHUB_RUN_ID"]
                print(f"Buffer (instagram): {(post.get('error') or {}).get('message', 'Sin detalle')}")
            if status in ("sent", "error"):
                ig["estado"] = "publicado" if status == "sent" else "fallido"
                save(queue, f"Actualizar estado de Instagram: {job['id']}")
        if ig.get("estado") == "publicado" and tweet.get("estado") == "pendiente":
            submit(queue, job, "x", x)
        if tweet.get("estado") == "enviado":
            post = delivered(x).get(tweet["buffer_id"], {})
            status = post.get("status")
            if status == "error":
                tweet["github_run_id"] = os.environ["GITHUB_RUN_ID"]
                print(f"Buffer (x): {(post.get('error') or {}).get('message', 'Sin detalle')}")
            if status in ("sent", "error"):
                tweet["estado"] = "publicado" if status == "sent" else "fallido"
                save(queue, f"Actualizar estado de X: {job['id']}")
        if any(item.get("estado") in ("fallido", "rechazado") for item in (ig, tweet)):
            print(f"Revisar en Buffer la publicación {job['id']}.")


if __name__ == "__main__":
    if os.environ.get("VERIFICAR_BUFFER") == "1":
        discover_channels()
        print("Conexión verificada con Instagram y X.")
    else:
        main()
