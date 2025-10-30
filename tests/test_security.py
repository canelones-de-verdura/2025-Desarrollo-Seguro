import pytest
import random
import requests
from requests.utils import unquote
import quopri
import re

# crear token
MAILHOG_API = "http://localhost:8025/api/v2/messages"

def get_last_email_body():
    resp = requests.get(MAILHOG_API)
    resp.raise_for_status()
    data = resp.json()

    if not data["items"]:
        return None  # no emails received yet

    last_email = data["items"][0]
    body = last_email["Content"]["Body"]
    decoded = quopri.decodestring(body).decode("utf-8", errors="replace")
    return unquote(decoded)

def extract_links(decoded_html):
    return re.findall(r'<a\s+href=["\']([^"\']+)["\']', decoded_html, re.IGNORECASE)[0]

def extract_query_params(url):
    # regex: busca ?token= o &token= seguido de cualquier cosa hasta &, # o fin de string
    patron = re.compile(r"(?:[?&])token=([^&#]+)")
    m = patron.search(url)
    return m.group(1) if m else None

@pytest.fixture(autouse=True)
def setup_create_user():
    # random username
    i= random.randint(1000, 999999)
    username = f'user{i}'
    email = f'{username}@test.com'
    password = 'password'
    salida = requests.post("http://localhost:5000/users",
                        data={
                            "username": username, 
                            "password": password,
                            "email":email,
                            "first_name":"Name",
                            "last_name": f'{username}son'
                            })
    # user created
    assert salida.status_code == 201

    mail = get_last_email_body()
    link = extract_links(mail)
    token = extract_query_params(link)

    # activate user
    response = requests.post("http://localhost:5000/auth/set-password", json={"token": token, "newPassword": password})


    return [username,password]

def test_login(setup_create_user):
    username = setup_create_user[0]
    password = setup_create_user[1]

    response = requests.post("http://localhost:5000/auth/login", json={"username": username, "password": password})
    auth_token = response.json()["token"]
    assert auth_token

# Utilizamos el set up proporcionado previamente para realizar el login. Una vez realizamos el mismo, intentamos hacer la SQL Injection
# que documentamos en el practico 2. Lo que hacemos es guardar nuestro id de usuario que nos devuelve el login y comparamos si
# alguno de los invoices tiene un id de usuario distinto al nuestro. En main falla, en practico-2 no.
def test_sql_inyection(setup_create_user):
    username = setup_create_user[0]
    password = setup_create_user[1]

    response = requests.post("http://localhost:5000/auth/login", json={"username": username, "password": password})
    auth_token = response.json()['token']
    
    myId = response.json()['user']['id']

    url = "http://localhost:5000/invoices?status=paid'%20OR%20'a'='a&operator=!="

    headers = {"Authorization": f"Bearer {auth_token}"}

    responseInvoice = requests.get(url, headers=headers)

    for invoice in responseInvoice.json():
        invoice_id = invoice['userId']
    
        assert invoice_id == myId, " RIP"
