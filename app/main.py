import httpx
import os
from fastapi import FastAPI, HTTPException, Request, Body
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi.responses import HTMLResponse
from openai import OpenAI
from dotenv import load_dotenv
load_dotenv()
app = FastAPI()
def get_openai_client():
    api_key = os.getenv("OPENAI_API_KEY")
    if api_key:
        return OpenAI(api_key=api_key)
    return None
app.mount("/static", StaticFiles(directory="app/static"), name="static")
templates = Jinja2Templates(directory="app/templates")
HP_API_BASE = "https://hp-api.onrender.com/api"
async def fetch_from_api(endpoint: str):
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(f"{HP_API_BASE}/{endpoint}")
            response.raise_for_status()
            return response.json()
        except httpx.HTTPError as exc:
            raise HTTPException(status_code=502, detail=f"Error communicating with HP-API: {exc}")
@app.get("/api/status")
async def get_status():
    api_key = os.getenv("OPENAI_API_KEY")
    return {
        "openai_key_configured": api_key is not None,
        "api_status": "ok"
    }
@app.get("/", response_class=HTMLResponse)
async def read_root(request: Request):
    return templates.TemplateResponse("index.html", {"request": request, "title": "Harry Potter Explorer"})
@app.get("/houses", response_class=HTMLResponse)
async def read_houses(request: Request):
    houses = [
        {"name": "Gryffindor", "colors": "Scarlet and Gold", "animal": "Lion", "traits": "Courage, bravery, determination"},
        {"name": "Slytherin", "colors": "Green and Silver", "animal": "Serpent", "traits": "Ambition, cunning, resourcefulness"},
        {"name": "Hufflepuff", "colors": "Yellow and Black", "animal": "Badger", "traits": "Hard work, patience, loyalty, justice"},
        {"name": "Ravenclaw", "colors": "Blue and Bronze", "animal": "Eagle", "traits": "Intelligence, knowledge, curiosity"}
    ]
    return templates.TemplateResponse("houses.html", {"request": request, "houses": houses})
@app.get("/characters", response_class=HTMLResponse)
async def read_characters_page(request: Request):
    return templates.TemplateResponse("characters.html", {"request": request})
@app.get("/api/characters")
async def get_characters(name: str = None):
    data = await fetch_from_api("characters")
    if name:
        data = [c for c in data if name.lower() in c['name'].lower()]
    return data
@app.get("/api/characters/{char_id}")
async def get_character_detail(char_id: str):
    data = await fetch_from_api(f"character/{char_id}")
    if not data:
        raise HTTPException(status_code=404, detail="Character not found")
    return data[0] if isinstance(data, list) else data

@app.post("/api/chat")
async def chat_with_character(
    char_name: str = Body(..., embed=True),
    message: str = Body(..., embed=True)
):
    client_openai = get_openai_client()
    if not client_openai:
        return {"reply": "Ошибка: OPENAI_API_KEY не настроен на сервере."}
    try:
        system_prompt = f"Ты - {char_name}, персонаж из вселенной Гарри Поттера. Отвечай кратко, соблюдая характер и манеру речи этого персонажа. Не выходи из роли."
        response = client_openai.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": message}
            ],
            max_tokens=150
        )
        return {"reply": response.choices[0].message.content}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
