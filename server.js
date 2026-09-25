import express from "express";

const app = express();
const PORT = process.env.PORT || 3000;

const UPSTREAM =
  "https://renderproxy-pre1.onrender.com/";


// ============================================================
// 簡易キャッシュ
// ============================================================

const cache = new Map();

const CACHE_TIME =
  5 * 60 * 1000;


// ============================================================
// メイン画面
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
}


body {
  display: flex;
  flex-direction: column;

  background: #111;
  color: #eee;

  font-family:
    system-ui,
    sans-serif;
}


/* ========================================
   Toolbar
======================================== */

#toolbar {
  flex: 0 0 auto;

  padding: 8px;

  background: #181818;

  border-bottom:
    1px solid #333;
}


#urlRow {
  display: flex;
  gap: 6px;
}


#url {
  flex: 1;
  min-width: 0;

  padding: 9px;

  border:
    1px solid #444;

  border-radius: 7px;

  background: #292929;
  color: white;

  outline: none;
}


#url:focus {
  border-color: #55aaff;
}


/* ========================================
   Buttons
======================================== */

button {
  padding: 8px 12px;

  border:
    1px solid #444;

  border-radius: 7px;

  background: #292929;
  color: white;

  cursor: pointer;
}


button:hover {
  background: #383838;
}


#open {
  background: #1473e6;

  border-color:
    #1473e6;
}


/* ========================================
   Settings
======================================== */

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


input[type="color"] {
  width: 36px;
  height: 28px;

  padding: 0;

  border: 0;

  background: transparent;
}


input[type="range"] {
  width: 100px;
}


#wallpaper {
  max-width: 180px;
}


/* ========================================
   Status
======================================== */

#status {
  min-height: 17px;

  margin-top: 6px;

  color: #aaa;

  font-size: 12px;
}


/* ========================================
   Viewer
======================================== */

#viewer {
  flex: 1;

  width: 100%;

  border: 0;

  background: #111;
}

</style>

</head>


<body>


<div id="toolbar">

  <div id="urlRow">

    <button id="reload">
      ↻
    </button>


    <input
      id="url"
      value="https://example.com/"
      placeholder="https://example.com/"
      autocomplete="off"
    >


    <button id="open">
      開く
    </button>

  </div>


  <div id="settings">


    <label class="setting">

      文字

      <input
        id="textColor"
        type="color"
        value="#eeeeee"
      >

    </label>


    <label class="setting">

      リンク

      <input
        id="linkColor"
        type="color"
        value="#65caff"
      >

    </label>


    <label class="setting">

      背景画像

      <input
        id="wallpaper"
        type="file"
        accept="image/*"
      >

    </label>


    <label class="setting">

      暗さ

      <input
        id="darkness"
        type="range"
        min="0"
        max="100"
        value="35"
      >

      <span id="darknessValue">
        35%
      </span>

    </label>


    <label class="setting">

      背景除去

      <input
        id="removeBackground"
        type="checkbox"
        checked
      >

    </label>


    <button id="removeImage">
      画像を外す
    </button>


    <button id="reset">
      リセット
    </button>


  </div>


  <div id="status">
    待機中
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
    allow-same-origin
  "
></iframe>


<script>


// ============================================================
// Elements
// ============================================================

const viewer =
  document.getElementById(
    "viewer"
  );


const urlInput =
  document.getElementById(
    "url"
  );


const statusElement =
  document.getElementById(
    "status"
  );


const textColor =
  document.getElementById(
    "textColor"
  );


const linkColor =
  document.getElementById(
    "linkColor"
  );


const wallpaperInput =
  document.getElementById(
    "wallpaper"
  );


const darkness =
  document.getElementById(
    "darkness"
  );


const darknessValue =
  document.getElementById(
    "darknessValue"
  );


const removeBackground =
  document.getElementById(
    "removeBackground"
  );


let wallpaper = "";

let currentURL = "";


// ============================================================
// URL
// ============================================================

function normalizeURL(value) {

  let url =
    value.trim();


  if (!url) {
    return "";
  }


  if (
    !/^https?:\\/\\//i.test(
      url
    )
  ) {

    url =
      "https://" + url;

  }


  return url;

}


// ============================================================
// 設定保存
// ============================================================

function saveSettings() {

  const data = {

    text:
      textColor.value,

    link:
      linkColor.value,

    darkness:
      darkness.value,

    removeBackground:
      removeBackground.checked

  };


  localStorage.setItem(
    "ijiru-v3",
    JSON.stringify(data)
  );

}


// ============================================================
// 設定読込
// ============================================================

function loadSettings() {

  try {

    const data =
      JSON.parse(
        localStorage.getItem(
          "ijiru-v3"
        ) ||
        "{}"
      );


    if (data.text) {

      textColor.value =
        data.text;

    }


    if (data.link) {

      linkColor.value =
        data.link;

    }


    if (
      data.darkness !==
      undefined
    ) {

      darkness.value =
        data.darkness;

    }


    if (
      data.removeBackground !==
      undefined
    ) {

      removeBackground.checked =
        data.removeBackground;

    }

  }

  catch (error) {

    console.error(error);

  }

}


// ============================================================
// iframe取得
// ============================================================

function getDocument() {

  try {

    return (
      viewer.contentDocument ||
      viewer.contentWindow.document
    );

  }

  catch (error) {

    console.error(error);

    return null;

  }

}


// ============================================================
// テーマ適用
//
// 重要:
//
// renderproxyへの通信はしない。
// iframe内だけを変更。
// ============================================================

function applyTheme() {

  const doc =
    getDocument();


  if (!doc) {
    return;
  }


  // ------------------------------------------
  // 前のテーマを削除
  // ------------------------------------------

  const old =
    doc.getElementById(
      "ijiru-live-theme"
    );


  if (old) {

    old.remove();

  }


  // ------------------------------------------
  // style生成
  // ------------------------------------------

  const style =
    doc.createElement(
      "style"
    );


  style.id =
    "ijiru-live-theme";


  const dark =
    Math.max(
      0,
      Math.min(
        100,
        Number(
          darkness.value
        )
      )
    ) / 100;


  let backgroundImage =
    "none";


  if (wallpaper) {

    backgroundImage =
      "linear-gradient(" +
      "rgba(0,0,0," +
      dark +
      ")," +
      "rgba(0,0,0," +
      dark +
      ")" +
      ")," +
      "url('" +
      wallpaper +
      "')";

  }


  style.textContent = \`

html {

  background-color:
    #111 !important;

  background-image:
    \${backgroundImage}
    !important;

  background-size:
    cover !important;

  background-position:
    center center !important;

  background-repeat:
    no-repeat !important;

  background-attachment:
    fixed !important;

}


body {

  color:
    \${textColor.value}
    !important;

}


body,
p,
span,
li,
label,
td,
th,
article,
section,
main,
blockquote {

  color:
    \${textColor.value}
    !important;

}


a,
a:link,
a:visited {

  color:
    \${linkColor.value}
    !important;

}

\`;


  (
    doc.head ||
    doc.documentElement
  ).appendChild(
    style
  );


  // ------------------------------------------
  // 元サイトの背景色処理
  // ------------------------------------------

  processBackgrounds(doc);


  saveSettings();

}


// ============================================================
// 背景処理
// ============================================================

function processBackgrounds(doc) {

  const elements =
    doc.querySelectorAll("*");


  elements.forEach(
    element => {


      // ----------------------------------------
      // 前回変更した背景を戻す
      // ----------------------------------------

      if (
        element.dataset
          .ijiruBackground
          !== undefined
      ) {

        element.style
          .backgroundColor =
            element.dataset
              .ijiruBackground;


        delete element.dataset
          .ijiruBackground;

      }


      // 背景除去OFF

      if (
        !removeBackground.checked
      ) {

        return;

      }


      // ----------------------------------------
      // 触らない要素
      // ----------------------------------------

      if (
        element.matches(
          "img," +
          "picture," +
          "video," +
          "canvas," +
          "svg," +
          "input," +
          "textarea," +
          "select," +
          "button"
        )
      ) {

        return;

      }


      const computed =
        doc.defaultView
          .getComputedStyle(
            element
          );


      const bg =
        computed
          .backgroundColor;


      // ----------------------------------------
      // 元から透明
      // ----------------------------------------

      if (
        bg ===
          "transparent" ||

        bg ===
          "rgba(0, 0, 0, 0)"
      ) {

        return;

      }


      // ----------------------------------------
      // 元値保存
      // ----------------------------------------

      element.dataset
        .ijiruBackground =
          element.style
            .backgroundColor;


      // ----------------------------------------
      // 透明化
      // ----------------------------------------

      element.style.setProperty(
        "background-color",
        "transparent",
        "important"
      );

    }
  );

}


// ============================================================
// ページを開く
//
// ★ここだけrenderproxyへアクセスする
// ============================================================

async function openPage(
  force = false
) {

  const url =
    normalizeURL(
      urlInput.value
    );


  if (!url) {
    return;
  }


  currentURL = url;

  urlInput.value = url;


  statusElement.textContent =
    "取得中...";


  try {


    const response =
      await fetch(
        "/api/page?" +
        new URLSearchParams({
          url: url,
          force:
            force ?
            "1" :
            "0"
        })
      );


    const result =
      await response.json();


    if (!response.ok) {

      throw new Error(
        result.error ||
        "取得できませんでした"
      );

    }


    viewer.srcdoc =
      result.html;


    viewer.onload =
      () => {

        applyTheme();


        statusElement.textContent =
          "表示中: " +
          currentURL +
          (
            result.cached
              ?
              "  [キャッシュ]"
              :
              ""
          );

      };


  }

  catch (error) {

    console.error(
      error
    );


    statusElement.textContent =
      "エラー: " +
      error.message;

  }

}


// ============================================================
// 壁紙
// ============================================================

wallpaperInput
  .addEventListener(
    "change",
    () => {


      const file =
        wallpaperInput
          .files[0];


      if (!file) {
        return;
      }


      if (
        !file.type
          .startsWith(
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


      reader.onload =
        () => {

          wallpaper =
            reader.result;

          /*
            renderproxyへアクセスせず
            即反映
          */

          applyTheme();

        };


      reader.readAsDataURL(
        file
      );

    }
  );


// ============================================================
// 色変更
// ============================================================

textColor
  .addEventListener(
    "input",
    applyTheme
  );


linkColor
  .addEventListener(
    "input",
    applyTheme
  );


// ============================================================
// 暗さ
// ============================================================

darkness
  .addEventListener(
    "input",
    () => {


      darknessValue
        .textContent =
          darkness.value +
          "%";


      applyTheme();

    }
  );


// ============================================================
// 背景除去
// ============================================================

removeBackground
  .addEventListener(
    "change",
    applyTheme
  );


// ============================================================
// 画像を外す
// ============================================================

document
  .getElementById(
    "removeImage"
  )
  .addEventListener(
    "click",
    () => {


      wallpaper = "";

      wallpaperInput.value =
        "";


      applyTheme();

    }
  );


// ============================================================
// リセット
// ============================================================

document
  .getElementById(
    "reset"
  )
  .addEventListener(
    "click",
    () => {


      textColor.value =
        "#eeeeee";


      linkColor.value =
        "#65caff";


      darkness.value =
        "35";


      darknessValue
        .textContent =
          "35%";


      removeBackground.checked =
        true;


      wallpaper =
        "";


      wallpaperInput.value =
        "";


      applyTheme();

    }
  );


// ============================================================
// Open
// ============================================================

document
  .getElementById(
    "open"
  )
  .addEventListener(
    "click",
    () => {

      openPage(false);

    }
  );


// ============================================================
// Reload
//
// 強制再取得。
// これはrenderproxyへアクセスする。
// ============================================================

document
  .getElementById(
    "reload"
  )
  .addEventListener(
    "click",
    () => {

      if (currentURL) {

        openPage(true);

      }

    }
  );


// ============================================================
// Enter
// ============================================================

urlInput
  .addEventListener(
    "keydown",
    event => {

      if (
        event.key ===
        "Enter"
      ) {

        openPage(false);

      }

    }
  );


// ============================================================
// 初期化
// ============================================================

loadSettings();


darknessValue
  .textContent =
    darkness.value +
    "%";


</script>

</body>

</html>
`);

});


// ============================================================
// API
//
// ここだけがrenderproxyと通信する。
// ============================================================

app.get(
  "/api/page",
  async (req, res) => {

    try {

      const url =
        req.query.url;


      const force =
        req.query.force ===
        "1";


      // ----------------------------------------
      // URLチェック
      // ----------------------------------------

      if (!url) {

        return res
          .status(400)
          .json({
            error:
              "URLが指定されていません"
          });

      }


      let parsed;


      try {

        parsed =
          new URL(url);

      }

      catch {

        return res
          .status(400)
          .json({
            error:
              "URLが正しくありません"
          });

      }


      if (
        parsed.protocol !==
          "http:" &&

        parsed.protocol !==
          "https:"
      ) {

        return res
          .status(400)
          .json({
            error:
              "HTTP/HTTPSのみ対応しています"
          });

      }


      // ----------------------------------------
      // キャッシュ
      // ----------------------------------------

      const cached =
        cache.get(url);


      if (
        !force &&
        cached &&
        Date.now() -
          cached.time <
          CACHE_TIME
      ) {

        console.log(
          "CACHE:",
          url
        );


        return res.json({

          html:
            cached.html,

          cached:
            true

        });

      }


      // ----------------------------------------
      // Base64
      // ----------------------------------------

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
        UPSTREAM +
        encoded;


      console.log(
        "FETCH:",
        proxyURL
      );


      // ----------------------------------------
      // renderproxy
      // ----------------------------------------

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


      // ----------------------------------------
      // 429
      // ----------------------------------------

      if (
        response.status ===
        429
      ) {

        const retry =
          response.headers.get(
            "retry-after"
          );


        let message =
          "renderproxyがアクセス制限中です。";


        if (retry) {

          message +=
            " Retry-After: " +
            retry;

        }


        return res
          .status(429)
          .json({
            error:
              message
          });

      }


      // ----------------------------------------
      // その他エラー
      // ----------------------------------------

      if (!response.ok) {

        return res
          .status(502)
          .json({

            error:
              "renderproxy returned HTTP " +
              response.status

          });

      }


      let html =
        await response.text();


      // ----------------------------------------
      // 相対URL対策
      // ----------------------------------------

      const base =
        '<base href="' +
        escapeHTML(url) +
        '">';


      if (
        /<head(?:\\s[^>]*)?>/i
          .test(html)
      ) {

        html =
          html.replace(

            /<head([^>]*)>/i,

            "<head$1>" +
            base

          );

      }

      else {

        html =
          base +
          html;

      }


      // ----------------------------------------
      // キャッシュ保存
      // ----------------------------------------

      cache.set(
        url,
        {

          time:
            Date.now(),

          html:
            html

        }
      );


      // ----------------------------------------
      // 古いキャッシュ掃除
      // ----------------------------------------

      for (
        const [key, value]
        of cache
      ) {

        if (
          Date.now() -
            value.time >
            CACHE_TIME
        ) {

          cache.delete(
            key
          );

        }

      }


      // ----------------------------------------
      // Return
      // ----------------------------------------

      res.setHeader(
        "Cache-Control",
        "no-store"
      );


      res.json({

        html:
          html,

        cached:
          false

      });


    }

    catch (error) {

      console.error(
        error
      );


      res
        .status(500)
        .json({

          error:
            "サーバーエラー: " +
            error.message

        });

    }

  }
);


// ============================================================
// HTML Escape
// ============================================================

function escapeHTML(value) {

  return String(value)

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
// Start
// ============================================================

app.listen(
  PORT,
  () => {

    console.log(
      "Ijiru Viewer v3"
    );

    console.log(
      "PORT:",
      PORT
    );

  }
);
