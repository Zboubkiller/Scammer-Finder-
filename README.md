# 🔍 Scammer Finder Extension

Browser extension powered by an **n8n** backend to analyze user profiles, detect malicious patterns, and flag suspicious activities.

---

## 🚀 Features

* **Automated Auditing:** Real-time extraction of user history and metadata injected directly into the DOM via non-intrusive status banners.
* **Smart Caching & Quota Management:** Built-in daily cache purging and rate-limiting handles backed by n8n Data Tables.
* **Localization:** Dynamic alert messaging based on user language preferences (`fr`, `en`, `es`, `de`).

---

## 🛠️ Tech Stack

* **Frontend:** JavaScript (Chrome Extension Manifest V3, Content Scripts, Background Service Workers).
* **Backend & Automation:** n8n Webhooks, Data Tables, and AI-driven validation nodes.

---

## 📦 Project Structure

```text
Reddit Scanner/
├── background.js
├── content_reddit.js
├── manifest.json
├── popup.html
├── popup.js
└── scrapper.json
