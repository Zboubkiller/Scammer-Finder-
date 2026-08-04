# SentinelAudit 🛡️

An automated backend workflow built with **n8n** and **LLM intelligence (Google Vertex AI)** designed to perform behavioral analysis and scam detection on user profiles. 

> **Important Note:** For the time being, this audit workflow is built and optimized exclusively for **Reddit** data.

It detects account takeovers ("zombie accounts"), fake safety reviews (astroturfing), and malicious spam while minimizing costs through an integrated caching and rate-limiting system.

---

## 🚀 Key Features

- **Reddit-Optimized**: Tailored specifically for Reddit user profiles, comment histories, and submission timelines.
- **Webhook-Driven**: Instantly processes incoming Reddit profile data payloads (username, language, and recent activity history).
- **Smart Caching**: Utilizes n8n Data Tables to cache audit results, preventing redundant LLM calls for previously analyzed profiles.
- **Abuse Protection**: Implements a secure daily rate-limiting mechanism via IP-hashing combined with dynamic salts.
- **AI Behavioral Analysis**: Leverages a Large Language Model to spot structural anomalies, temporal gaps, and generic reassurance phrases typical of compromised or bot-driven accounts.
- **Multi-Language Support**: Automatically adapts error and response messages based on the user's preferred language.

---

## ⚙️ Workflow Architecture

1. **Trigger (`Webhook`)**: Receives the Reddit profile data payload via HTTP POST.
2. **IP Anonymization & Hashing**: Securely hashes the client IP to track usage quotas anonymously.
3. **Quota Check (`If1`)**: Validates if the user has exceeded their daily analysis limit (default: 10 requests/day).
4. **Cache Lookup (`Get row(s)`)**: Checks the `audit_cache` data table to see if the profile has already been evaluated.
5. **Payload Optimization (`Code in JavaScript3`)**: Truncates recent Reddit activity items (keeping the latest 15) to optimize the LLM token payload size.
6. **AI Analysis (`Basic LLM Chain1`)**: Evaluates Reddit activity timelines and text patterns against strict detection matrices.
7. **Persistence (`Insert row` & `Update row(s)`)**: Stores new audit results in the cache and increments usage counters.

---

## 🛠️ Prerequisites & Setup

### 1. n8n Environment
- n8n instance supporting LangChain nodes.
- Google Vertex AI chat model credentials configured.

### 2. n8n Data Tables Required
You need to set up two Data Tables in your n8n project:

* **`audit_cache` Table**:
  - `username` (String)
  - `platform` (String - set to "reddit")
  - `isSuspicious` (String / Boolean)
  - `reason` (String)
  - `lang` (String)

* **`user_quotas` Table**:
  - `userHash` (String)
  - `api_calls` (Number)

---

## 🔌 API Usage Example

**Endpoint:** `POST /webhook/your-webhook-path`

**Payload Example:**
```json
{
  "body": {
    "username": "example_user",
    "platform": "reddit",
    "user_language": "en",
    "created_utc": 1500000000,
    "activity": [
      {
        "type": "comment",
        "target_post_title": "Free Crack Keygen Pro Activator",
        "body": "working, thanks 100% safe"
      }
    ]
  }
}
