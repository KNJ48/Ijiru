import express from "express";

const app = express();

const PORT = process.env.PORT || 3000;

const UPSTREAM =
    "https://renderproxy-pre1.onrender.com/";

// CORS許可
app.use((req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    next();
});

app.get("/", (req, res) => {
    res.send("Ijiru server is running.");
});

app.get("/page", async (req, res) => {
    try {
        const url = req.query.url;

        if (!url) {
            return res.status(400).send(
                "url parameter is required"
            );
        }

        // URL → Base64
        const encoded =
            Buffer.from(url, "utf8").toString("base64");

        const proxyURL =
            UPSTREAM + encoded;

        console.log("GET:", proxyURL);

        // 既存renderproxyから取得
        const response = await fetch(proxyURL);

        if (!response.ok) {
            return res.status(response.status).send(
                `Upstream error: ${response.status}`
            );
        }

        let html = await response.text();

        // 相対URL用
        const base = `
<base href="${escapeHTML(url)}">
`;

        // 好きな加工
        const theme = `
<style id="ijiru-theme">

html, body {
    background-color: #111 !important;
    color: #eee !important;
}

a {
    color: #62caff !important;
}

</style>
`;

        // <head> に注入
        if (/<head[\s>]/i.test(html)) {
            html = html.replace(
                /<head([^>]*)>/i,
                "<head$1>" + base + theme
            );
        } else {
            html = base + theme + html;
        }

        res.type("html").send(html);

    } catch (error) {
        console.error(error);

        res.status(500).send(
            "Error: " + error.message
        );
    }
});

function escapeHTML(str) {
    return str
        .replaceAll("&", "&amp;")
        .replaceAll('"', "&quot;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;");
}

app.listen(PORT, () => {
    console.log(`Listening on ${PORT}`);
});
