import json
import math
import requests

OLLAMA = "http://localhost:11434"
EMBED_MODEL = "nomic-embed-text:latest"
CHAT_MODEL = "deepseek-r1:32b"

CORPUS = "pmq_corpus.jsonl"
TOP_K = 5

def embed(text: str):
    r = requests.post(
        f"{OLLAMA}/api/embeddings",
        json={"model": EMBED_MODEL, "prompt": text},
        timeout=120
    )
    r.raise_for_status()
    return r.json()["embedding"]

def generate(prompt: str) -> str:
    r = requests.post(
        f"{OLLAMA}/api/generate",
        json={"model": CHAT_MODEL, "prompt": prompt, "stream": False, "temperature": 0.2},
        timeout=300
    )
    r.raise_for_status()
    return r.json()["response"]

def cosine(a, b):
    dot = sum(x * y for x, y in zip(a, b))
    na = math.sqrt(sum(x * x for x in a))
    nb = math.sqrt(sum(x * x for x in b))
    return dot / (na * nb + 1e-9)

docs = []
with open(CORPUS, "r", encoding="utf-8-sig") as f:
    for line in f:
        line = line.strip()
        if not line:
            continue
        docs.append(json.loads(line))

print(f"Loaded {len(docs)} articles")

print("Embedding articles...")
for d in docs:
    d["vec"] = embed(d["text"][:4000])

while True:
    q = input("\nQuestion (blank to quit): ").strip()
    if not q:
        break

    qv = embed(q)

    scored = []
    for d in docs:
        sim = cosine(qv, d["vec"])
        scored.append((sim, d))

    scored.sort(key=lambda x: x[0], reverse=True)
    top = scored[:TOP_K]

    evidence = []
    citations = []
    for i, (_, d) in enumerate(top, 1):
        evidence.append(f"[Evidence {i}] {d['title']}\n{d['text']}")
        citations.append(d["title"])

    prompt = (
        "Answer using ONLY the evidence below. Be concise and practical.\n"
        "List the main causes and the recommended fixes if the evidence supports more than one.\n"
        "Do NOT reproduce the articles. If evidence is missing, say what’s missing.\n\n"
        f"Question: {q}\n\n"
        + "\n\n".join(evidence)
        + "\n\nReturn format:\nAnswer:\nSources:\n"
    )

    answer = generate(prompt).strip()
    print("\n" + answer)
    print("\nSources:")
    for c in citations:
        print(" - " + c)