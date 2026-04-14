# API Contract

## POST /ask

### Request
{
  "user_id": "string",
  "query": "string",
  "location": "string"
}

### Response
{
  "response": "string",
  "actions": ["string"],
  "emotion": "calm | concern | panic"
}

---

## POST /memory

### Request
{
  "user_id": "string",
  "key": "string",
  "value": "string"
}

### Response
{
  "message": "stored"
}

---

## GET /memory?user_id=123

### Response
{
  "language": "hindi",
  "preference": "slow speech"
}
