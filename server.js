import express from "express";

const app = express();
const PORT = process.env.PORT || 3000;

const UPSTREAM =
    "https://renderproxy-pre1.onrender.com/";


// ============================================================
// 共通
// ============================================================

app.use(express.json({
    limit: "20mb"
}));


// ============================================================
// 操作画面
// ============================================================

app.get("/", (req, res) => {
    res.type("html").send(`
<!DOCTYPE html>
<html lang="ja">

<head>
<meta charset="UTF-8">

<meta
    name="viewport"
    content="width=device-width, initial-scale=1"
>

<title>Ijiru Viewer</title>

<style>

* {
    box-sizing: border-box;
}

html,
body {
    margin: 0;
    width: 100%;
    height: 100%;
    background: #111;
    color: #eee;
    font-family:
        system-ui,
        -apple-system,
        sans-serif;
}

body {
    display: flex;
    flex-direction: column;
}


/* ================================
   上部
================================ */

#top {
    flex: 0 0 auto;

    background: #181818;

    border-bottom:
        1px solid #333;

    padding: 8px;
}


/* URLバー */

#urlbar {
    display: flex;
    gap: 6px;
}

#url {
    flex: 1;

    min-width: 0;

    border:
        1px solid #444;

    border-radius: 7px;

    background: #292929;
    color: white;

    padding: 9px 11px;

    font-size: 15px;

    outline: none;
}

#url:focus {
    border-color: #52a8ff;
}


/* ボタン */

button {
    border:
        1px solid #444;

    border-radius: 7px;

    background: #292929;
    color: #eee;

    padding: 8px 13px;

    cursor: pointer;
}

button:hover {
    background: #383838;
}

button.primary {
    background: #1473e6;
    border-color: #1473e6;
    color: white;
}


/* ================================
   設定
================================ */

#settings {
    display: flex;

    flex-wrap: wrap;

    align-items: center;

    gap: 12px;

    margin-top: 8px;
}

.setting {
    display: flex;

    align-items: center;

    gap: 5px;

    font-size: 13px;
}

.setting input[type="color"] {
    width: 35px;
    height: 27px;

    border: 0;
    padding: 0;

    background: transparent;
}

.setting input[type="range"] {
    width: 100px;
}

#wallpaper {
    max-width: 190px;
}


/* ================================
   ステータス
================================ */

#status {
    margin-top: 6px;

    min-height: 17px;

    font-size: 12px;

    color: #aaa;
}


/* ================================
   Web表示
================================ */

#viewer {
    flex: 1;

    width: 100%;

    border: 0;

    background: white;
}


/* Chromebookなど狭めの画面 */

@media(max-width: 700px) {

    #settings {
        gap: 8px;
    }

    .setting {
        font-size: 12px;
    }

}

</style>
</head>


<body>


<div id="top">

    <div id="urlbar">

        <button
            id="reloadButton"
            title="再読み込み"
        >
            ↻
        </button>

        <input
            id="url"
            value="https://example.com/"
            placeholder="https://example.com/"
            autocomplete="off"
        >

        <button
            id="openButton"
            class="primary"
        >
            開く
        </button>

    </div>


    <div id="settings">

        <label class="setting">
            背景
            <input
                type="color"
                id="backgroundColor"
                value="#151515"
            >
        </label>


        <label class="setting">
            文字
            <input
                type="color"
                id="textColor"
                value="#eeeeee"
            >
        </label>


        <label class="setting">
            リンク
            <input
                type="color"
                id="linkColor"
                value="#65caff"
            >
        </label>


        <label class="setting">
            暗さ

            <input
                type="range"
                id="darkness"
                min="0"
                max="100"
                value="45"
            >

            <span id="darknessValue">
                45%
            </span>
        </label>


        <label class="setting">
            壁紙
            <input
                type="file"
                id="wallpaper"
                accept="image/*"
            >
        </label>


        <button id="removeWallpaper">
            壁紙なし
        </button>


        <button id="resetButton">
            初期設定
        </button>

    </div>


    <div id="status">
        URLを入力してください
    </div>

</div>


<iframe
    id="viewer"
    sandbox="
        allow-scripts
        allow-forms
        allow-modals
        allow-popups
        allow-downloads
    "
></iframe>


<script>

const viewer =
    document.getElementById("viewer");

const urlInput =
    document.getElementById("url");

const status =
    document.getElementById("status");

const backgroundInput =
    document.getElementById(
        "backgroundColor"
    );

const textInput =
    document.getElementById(
        "textColor"
    );

const linkInput =
    document.getElementById(
        "linkColor"
    );

const darknessInput =
    document.getElementById(
        "darkness"
    );

const darknessValue =
    document.getElementById(
        "darknessValue"
    );

const wallpaperInput =
    document.getElementById(
        "wallpaper"
    );


let wallpaper = "";

let currentURL = "";


// ============================================================
// 設定
// ============================================================

function getSettings() {

    return {

        background:
            backgroundInput.value,

        text:
            textInput.value,

        link:
            linkInput.value,

        darkness:
            Number(
                darknessInput.value
            ),

        wallpaper:
            wallpaper

    };

}


function saveSettings() {

    /*
        壁紙は大きすぎると
        localStorageに入らないので
        色設定だけ保存
    */

    const settings = getSettings();

    delete settings.wallpaper;

    localStorage.setItem(
        "ijiru-settings",
        JSON.stringify(settings)
    );

}


function loadSettings() {

    try {

        const raw =
            localStorage.getItem(
                "ijiru-settings"
            );

        if (!raw) {
            return;
        }

        const settings =
            JSON.parse(raw);


        if (settings.background) {
            backgroundInput.value =
                settings.background;
        }

        if (settings.text) {
            textInput.value =
                settings.text;
        }

        if (settings.link) {
            linkInput.value =
                settings.link;
        }

        if (
            settings.darkness !==
            undefined
        ) {

            darknessInput.value =
                settings.darkness;
        }

    } catch (e) {

        console.error(e);

    }

}


// ============================================================
// URL
// ============================================================

function normalizeURL(url) {

    url = url.trim();

    if (!url) {
        return "";
    }

    if (
        !/^https?:\\/\\//i.test(url)
    ) {

        url =
            "https://" + url;
    }

    return url;

}


// ============================================================
// ページを開く
// ============================================================

async function openPage() {

    let url =
        normalizeURL(
            urlInput.value
        );

    if (!url) {
        return;
    }

    currentURL = url;

    urlInput.value = url;


    status.textContent =
        "取得中...";


    try {

        const settings =
            getSettings();


        const response =
            await fetch(
                "/api/page",
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body:
                        JSON.stringify({
                            url,
                            ...settings
                        })
                }
            );


        if (!response.ok) {

            const error =
                await response.text();

            throw new Error(error);
        }


        const html =
            await response.text();


        viewer.srcdoc = html;


        status.textContent =
            "表示中: " + url;


        saveSettings();


    } catch (error) {

        console.error(error);

        status.textContent =
            "エラー: " +
            error.message;

    }

}


// ============================================================
// 設定変更
// ============================================================

function settingsChanged() {

    darknessValue.textContent =
        darknessInput.value + "%";

    saveSettings();


    if (currentURL) {

        /*
            ページを再取得する。

            最初は確実に動く方法を使用。
        */

        openPage();

    }

}


backgroundInput.addEventListener(
    "change",
    settingsChanged
);

textInput.addEventListener(
    "change",
    settingsChanged
);

linkInput.addEventListener(
    "change",
    settingsChanged
);


darknessInput.addEventListener(
    "input",
    () => {

        darknessValue.textContent =
            darknessInput.value + "%";

    }
);


darknessInput.addEventListener(
    "change",
    settingsChanged
);


// ============================================================
// 壁紙
// ============================================================

wallpaperInput.addEventListener(
    "change",
    () => {

        const file =
            wallpaperInput.files[0];

        if (!file) {
            return;
        }


        if (
            !file.type.startsWith(
                "image/"
            )
        ) {

            alert(
                "画像ファイルを選択してください"
            );

            return;
        }


        const reader =
            new FileReader();


        reader.onload = () => {

            wallpaper =
                reader.result;

            if (currentURL) {
                openPage();
            }

        };


        reader.readAsDataURL(file);

    }
);


document
    .getElementById(
        "removeWallpaper"
    )
    .addEventListener(
        "click",
        () => {

            wallpaper = "";

            wallpaperInput.value =
                "";

            if (currentURL) {
                openPage();
            }

        }
    );


// ============================================================
// 初期化
// ============================================================

document
    .getElementById(
        "resetButton"
    )
    .addEventListener(
        "click",
        () => {

            backgroundInput.value =
                "#151515";

            textInput.value =
                "#eeeeee";

            linkInput.value =
                "#65caff";

            darknessInput.value =
                "45";

            darknessValue.textContent =
                "45%";

            wallpaper = "";

            wallpaperInput.value =
                "";

            saveSettings();

            if (currentURL) {
                openPage();
            }

        }
    );


document
    .getElementById(
        "openButton"
    )
    .addEventListener(
        "click",
        openPage
    );


document
    .getElementById(
        "reloadButton"
    )
    .addEventListener(
        "click",
        () => {

            if (currentURL) {
                openPage();
            }

        }
    );


urlInput.addEventListener(
    "keydown",
    event => {

        if (
            event.key === "Enter"
        ) {

            openPage();

        }

    }
);


loadSettings();

darknessValue.textContent =
    darknessInput.value + "%";

</script>

</body>
</html>
`);
});


// ============================================================
// 加工API
// ============================================================

app.post(
    "/api/page",
    async (req, res) => {

        try {

            const {
                url,

                background =
                    "#151515",

                text =
                    "#eeeeee",

                link =
                    "#65caff",

                darkness = 45,

                wallpaper = ""

            } = req.body;


            // URLチェック

            if (!url) {

                return res
                    .status(400)
                    .send(
                        "URLがありません"
                    );

            }


            let parsed;

            try {

                parsed =
                    new URL(url);

            } catch {

                return res
                    .status(400)
                    .send(
                        "URLが正しくありません"
                    );

            }


            if (
                parsed.protocol !==
                    "http:" &&
                parsed.protocol !==
                    "https:"
            ) {

                return res
                    .status(400)
                    .send(
                        "HTTP/HTTPSのみ使用できます"
                    );

            }


            // ================================================
            // renderproxy用Base64
            // ================================================

            const encoded =
                Buffer
                    .from(
                        url,
                        "utf8"
                    )
                    .toString(
                        "base64"
                    );


            const proxyURL =
                UPSTREAM + encoded;


            console.log(
                "Fetching:",
                proxyURL
            );


            const response =
                await fetch(
                    proxyURL,
                    {
                        redirect:
                            "follow",

                        headers: {
                            "User-Agent":
                                "Mozilla/5.0"
                        }
                    }
                );


            if (!response.ok) {

                return res
                    .status(502)
                    .send(
                        "renderproxy returned HTTP " +
                        response.status
                    );

            }


            let html =
                await response.text();


            // ================================================
            // CSS生成
            // ================================================

            const safeBackground =
                validColor(
                    background,
                    "#151515"
                );

            const safeText =
                validColor(
                    text,
                    "#eeeeee"
                );

            const safeLink =
                validColor(
                    link,
                    "#65caff"
                );


            const dark =
                Math.max(
                    0,
                    Math.min(
                        100,
                        Number(darkness) ||
                        0
                    )
                ) / 100;


            let backgroundCSS =
                safeBackground;


            /*
                data:image/... のみ
                壁紙として認める
            */

            let wallpaperCSS = "";


            if (
                typeof wallpaper ===
                    "string" &&
                wallpaper.startsWith(
                    "data:image/"
                )
            ) {

                const safeWallpaper =
                    wallpaper.replace(
                        /["'()\\\\]/g,
                        char =>
                            "\\\\" + char
                    );


                wallpaperCSS = `
background-image:
    linear-gradient(
        rgba(0,0,0,${dark}),
        rgba(0,0,0,${dark})
    ),
    url("${safeWallpaper}")
    !important;

background-size:
    cover !important;

background-position:
    center center !important;

background-repeat:
    no-repeat !important;

background-attachment:
    fixed !important;
`;

            }


            const injection = `

<base href="${escapeHTML(url)}">

<style id="ijiru-theme">

/*
    ページ本体
*/

html {
    background:
        ${safeBackground}
        !important;
}

body {
    color:
        ${safeText}
        !important;

    background-color:
        ${backgroundCSS}
        !important;

    ${wallpaperCSS}
}


/*
    一般的な文字
*/

body,
p,
span,
li,
label,
td,
th,
blockquote,
article,
section,
main {
    color:
        ${safeText}
        !important;
}


/*
    リンク
*/

a,
a:link,
a:visited {
    color:
        ${safeLink}
        !important;
}


/*
    入力系
*/

input,
textarea,
select,
button {
    color:
        ${safeText}
        !important;

    background-color:
        rgba(
            25,
            25,
            25,
            0.88
        )
        !important;

    border-color:
        #555
        !important;
}


/*
    コード
*/

pre,
code {
    color:
        ${safeText}
        !important;

    background-color:
        rgba(
            0,
            0,
            0,
            0.55
        )
        !important;
}


/*
    画像自体には
    ダークフィルターをかけない
*/

img,
video,
canvas {
    color-scheme:
        normal;
}


/*
    Chromiumのフォーム等
*/

html {
    color-scheme:
        dark;
}

</style>

`;


            // ================================================
            // HTMLに挿入
            // ================================================

            if (
                /<head(?:\\s[^>]*)?>/i
                    .test(html)
            ) {

                html =
                    html.replace(
                        /<head([^>]*)>/i,

                        "<head$1>" +
                        injection
                    );

            } else {

                html =
                    injection +
                    html;

            }


            // ================================================
            // 返す
            // ================================================

            res.setHeader(
                "Cache-Control",
                "no-store"
            );


            res
                .type("html")
                .send(html);


        } catch (error) {

            console.error(error);


            res
                .status(500)
                .send(
                    "サーバーエラー: " +
                    error.message
                );

        }

    }
);


// ============================================================
// 補助
// ============================================================

function validColor(
    color,
    fallback
) {

    if (
        typeof color !==
        "string"
    ) {

        return fallback;
    }


    /*
        color pickerから来る
        #RRGGBBのみ受理
    */

    if (
        /^#[0-9a-fA-F]{6}$/
            .test(color)
    ) {

        return color;
    }


    return fallback;
}


function escapeHTML(str) {

    return String(str)

        .replaceAll(
            "&",
            "&amp;"
        )

        .replaceAll(
            '"',
            "&quot;"
        )

        .replaceAll(
            "<",
            "&lt;"
        )

        .replaceAll(
            ">",
            "&gt;"
        );

}


// ============================================================
// 起動
// ============================================================

app.listen(
    PORT,
    () => {

        console.log(
            "Ijiru Viewer running on port",
            PORT
        );

    }
);
