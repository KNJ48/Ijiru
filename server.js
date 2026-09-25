import express from "express";

const app = express();
const PORT = process.env.PORT || 3000;

const UPSTREAM =
  "https://renderproxy-pre1.onrender.com/";

const cache = new Map();
const CACHE_TIME = 5 * 60 * 1000;


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

<title>Ijiru Viewer v4</title>

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
    -apple-system,
    sans-serif;
}


/* =========================================================
   ツールバー
========================================================= */

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

  padding: 9px 11px;

  border:
    1px solid #444;

  border-radius: 7px;

  background: #292929;
  color: white;

  outline: none;

  font-size: 15px;
}


#url:focus {
  border-color: #55aaff;
}


/* =========================================================
   ボタン
========================================================= */

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
  border-color: #1473e6;
}


#fullscreen {
  background: #263238;
}


/* =========================================================
   設定
========================================================= */

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


/* =========================================================
   ステータス
========================================================= */

#status {
  min-height: 17px;

  margin-top: 6px;

  color: #aaa;

  font-size: 12px;
}


/* =========================================================
   Viewer
========================================================= */

#viewerContainer {
  position: relative;

  flex: 1;

  min-height: 0;

  width: 100%;

  background: #111;
}


#viewer {
  display: block;

  width: 100%;
  height: 100%;

  border: 0;

  background: #111;
}


/* =========================================================
   全画面
========================================================= */

#viewerContainer:fullscreen {
  width: 100vw;
  height: 100vh;

  background: #111;
}


#viewerContainer:-webkit-full-screen {
  width: 100vw;
  height: 100vh;

  background: #111;
}


#exitFullscreen {
  display: none;

  position: absolute;

  top: 12px;
  right: 12px;

  z-index: 999999;

  padding: 9px 13px;

  border:
    1px solid rgba(
      255,
      255,
      255,
      0.25
    );

  border-radius: 8px;

  background:
    rgba(
      0,
      0,
      0,
      0.72
    );

  color: white;

  backdrop-filter:
    blur(6px);

  box-shadow:
    0 2px 10px
    rgba(
      0,
      0,
      0,
      0.35
    );
}


#viewerContainer:fullscreen
#exitFullscreen {
  display: block;
}


#viewerContainer:-webkit-full-screen
#exitFullscreen {
  display: block;
}


#exitFullscreen:hover {
  background:
    rgba(
      40,
      40,
      40,
      0.9
    );
}


/* =========================================================
   スマホ / Chromebook狭画面
========================================================= */

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


<div id="toolbar">

  <div id="urlRow">

    <button
      id="reload"
      title="再取得"
    >
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


    <button
      id="fullscreen"
      title="閲覧部分を全画面表示"
    >
      ⛶ 全画面
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


<div id="viewerContainer">

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


  <button id="exitFullscreen">
    × 全画面終了
  </button>

</div>


<script>

// ============================================================
// Elements
// ============================================================

const viewer =
  document.getElementById(
    "viewer"
  );


const viewerContainer =
  document.getElementById(
    "viewerContainer"
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

function normalizeURL(
  value
) {

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
      "https://" +
      url;

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
    "ijiru-v4",
    JSON.stringify(
      data
    )
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
          "ijiru-v4"
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

    console.error(
      error
    );

  }

}


// ============================================================
// iframe document
// ============================================================

function getDocument() {

  try {

    return (
      viewer.contentDocument ||
      viewer.contentWindow.document
    );

  }

  catch (error) {

    console.error(
      error
    );

    return null;

  }

}


// ============================================================
// テーマ適用
//
// renderproxyにはアクセスしない。
// ============================================================

function applyTheme() {

  const doc =
    getDocument();


  if (!doc) {
    return;
  }


  const old =
    doc.getElementById(
      "ijiru-live-theme"
    );


  if (old) {
    old.remove();
  }


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


  processBackgrounds(
    doc
  );


  saveSettings();

}


// ============================================================
// 背景色除去
// ============================================================

function processBackgrounds(
  doc
) {

  const elements =
    doc.querySelectorAll(
      "*"
    );


  elements.forEach(
    element => {


      /*
        前回変更分を戻す
      */

      if (
        element.dataset
          .ijiruBackground
          !== undefined
      ) {

        element.style
          .backgroundColor =
            element.dataset
              .ijiruBackground;


        delete element
          .dataset
          .ijiruBackground;

      }


      if (
        !removeBackground
          .checked
      ) {

        return;

      }


      /*
        画像やフォームは
        背景除去しない
      */

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


      if (
        bg ===
          "transparent" ||

        bg ===
          "rgba(0, 0, 0, 0)"
      ) {

        return;

      }


      element.dataset
        .ijiruBackground =
          element.style
            .backgroundColor;


      element.style
        .setProperty(
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
// ここだけrenderproxyへ通信
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


  currentURL =
    url;


  urlInput.value =
    url;


  statusElement.textContent =
    "取得中...";


  try {

    const response =
      await fetch(
        "/api/page?" +
        new URLSearchParams({

          url:
            url,

          force:
            force
              ?
              "1"
              :
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


    viewer.onload =
      () => {

        applyTheme();


        statusElement
          .textContent =
            "表示中: " +
            currentURL +
            (
              result.cached
                ?
                " [キャッシュ]"
                :
                ""
            );

      };


    viewer.srcdoc =
      result.html;

  }

  catch (error) {

    console.error(
      error
    );


    statusElement
      .textContent =
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
            再取得なし
          */

          applyTheme();

        };


      reader.readAsDataURL(
        file
      );

    }
  );


// ============================================================
// リアルタイム設定
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


removeBackground
  .addEventListener(
    "change",
    applyTheme
  );


// ============================================================
// 画像削除
// ============================================================

document
  .getElementById(
    "removeImage"
  )
  .addEventListener(
    "click",
    () => {

      wallpaper =
        "";


      wallpaperInput.value =
        "";


      applyTheme();

    }
  );


// ============================================================
// Reset
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

      openPage(
        false
      );

    }
  );


// ============================================================
// Reload
// ============================================================

document
  .getElementById(
    "reload"
  )
  .addEventListener(
    "click",
    () => {

      if (
        currentURL
      ) {

        openPage(
          true
        );

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

        openPage(
          false
        );

      }

    }
  );


// ============================================================
// 全画面開始
// ============================================================

document
  .getElementById(
    "fullscreen"
  )
  .addEventListener(
    "click",
    async () => {

      try {

        if (
          viewerContainer
            .requestFullscreen
        ) {

          await viewerContainer
            .requestFullscreen();

        }

        else if (
          viewerContainer
            .webkitRequestFullscreen
        ) {

          viewerContainer
            .webkitRequestFullscreen();

        }

      }

      catch (error) {

        console.error(
          error
        );


        statusElement
          .textContent =
            "全画面にできませんでした: " +
            error.message;

      }

    }
  );


// ============================================================
// 全画面終了
// ============================================================

document
  .getElementById(
    "exitFullscreen"
  )
  .addEventListener(
    "click",
    async () => {

      try {

        if (
          document.fullscreenElement
        ) {

          await document
            .exitFullscreen();

        }

        else if (
          document
            .webkitFullscreenElement
        ) {

          document
            .webkitExitFullscreen();

        }

      }

      catch (error) {

        console.error(
          error
        );

      }

    }
  );


// ============================================================
// Fullscreenイベント
// ============================================================

document
  .addEventListener(
    "fullscreenchange",
    () => {

      if (
        document
          .fullscreenElement
      ) {

        statusElement
          .textContent =
            "全画面表示中";

      }

      else if (
        currentURL
      ) {

        statusElement
          .textContent =
            "表示中: " +
            currentURL;

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
// Proxy API
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
      // Cache
      // ----------------------------------------

      const cached =
        cache.get(
          url
        );


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
      // Fetch
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
      // Other error
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
      // Base URL
      // ----------------------------------------

      const base =
        '<base href="' +
        escapeHTML(
          url
        ) +
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
      // Cache
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
      // 古いキャッシュ削除
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
// Escape
// ============================================================

function escapeHTML(
  value
) {

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
      "Ijiru Viewer v4"
    );

    console.log(
      "PORT:",
      PORT
    );

  }
);
