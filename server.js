import express from "express";

const app = express();

const PORT = process.env.PORT || 3000;

const UPSTREAM =
  "https://renderproxy-pre1.onrender.com/";


// ============================================================
// 5分キャッシュ
// ============================================================

const cache = new Map();

const CACHE_TIME =
  5 * 60 * 1000;


// ============================================================
// メインUI
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

/* ==========================================================
   基本
========================================================== */

* {
  box-sizing: border-box;
}


html,
body {
  margin: 0;

  width: 100%;
  height: 100%;

  overflow: hidden;
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


/* ==========================================================
   操作パネル
========================================================== */

#toolbar {
  flex: 0 0 auto;

  padding: 8px;

  background: #181818;

  border-bottom:
    1px solid #333;
}


/* ==========================================================
   URL
========================================================== */

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

  border-radius:
    7px;

  background:
    #292929;

  color:
    white;

  outline:
    none;

  font-size:
    15px;
}


#url:focus {
  border-color:
    #55aaff;
}


/* ==========================================================
   ボタン
========================================================== */

button {
  padding:
    8px 12px;

  border:
    1px solid #444;

  border-radius:
    7px;

  background:
    #292929;

  color:
    white;

  cursor:
    pointer;

  white-space:
    nowrap;
}


button:hover {
  background:
    #383838;
}


#open {
  background:
    #1473e6;

  border-color:
    #1473e6;
}


#viewMode {
  background:
    #273746;
}


/* ==========================================================
   設定
========================================================== */

#settings {
  display: flex;

  flex-wrap: wrap;

  align-items: center;

  gap: 12px;

  margin-top:
    8px;
}


.setting {
  display: flex;

  align-items: center;

  gap: 5px;

  font-size:
    13px;
}


input[type="color"] {
  width: 36px;
  height: 28px;

  padding: 0;

  border: 0;

  background:
    transparent;
}


input[type="range"] {
  width:
    100px;
}


#wallpaper {
  max-width:
    180px;
}


/* ==========================================================
   ステータス
========================================================== */

#status {
  min-height:
    17px;

  margin-top:
    6px;

  color:
    #aaa;

  font-size:
    12px;
}


/* ==========================================================
   ページ表示領域
========================================================== */

#viewerContainer {
  flex: 1;

  min-height:
    0;

  width:
    100%;

  background:
    #111;
}


#viewer {
  display: block;

  width:
    100%;

  height:
    100%;

  border:
    0;

  background:
    #111;
}


/* ==========================================================
   Chromebook等
========================================================== */

@media(max-width: 700px) {

  #settings {
    gap:
      8px;
  }


  .setting {
    font-size:
      12px;
  }


  #urlRow {
    gap:
      4px;
  }


  button {
    padding:
      8px 9px;
  }

}

</style>

</head>


<body>


<!-- ======================================================
     操作パネル
====================================================== -->

<div id="toolbar">


  <!-- URL -->

  <div id="urlRow">


    <button
      id="reload"
      title="サイトを再取得"
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
      id="viewMode"
      title="操作UIを隠す。ブラウザを再読み込みすると戻ります。"
    >
      👁 閲覧モード
    </button>


  </div>


  <!-- 設定 -->

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


<!-- ======================================================
     Webページ
====================================================== -->

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

</div>


<script>

// ============================================================
// Elements
// ============================================================

const toolbar =
  document.getElementById(
    "toolbar"
  );


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


// ============================================================
// State
// ============================================================

let wallpaper =
  "";


let currentURL =
  "";


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
//
// 閲覧モード状態は保存しない。
// ============================================================

function saveSettings() {

  const settings = {

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
    "ijiru-settings-v5",
    JSON.stringify(
      settings
    )
  );

}


// ============================================================
// 設定読込
// ============================================================

function loadSettings() {

  try {

    const settings =
      JSON.parse(

        localStorage.getItem(
          "ijiru-settings-v5"
        )

        ||

        "{}"

      );


    if (
      settings.text
    ) {

      textColor.value =
        settings.text;

    }


    if (
      settings.link
    ) {

      linkColor.value =
        settings.link;

    }


    if (
      settings.darkness !==
      undefined
    ) {

      darkness.value =
        settings.darkness;

    }


    if (
      settings.removeBackground !==
      undefined
    ) {

      removeBackground.checked =
        settings.removeBackground;

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
      viewer.contentDocument
      ||
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
// テーマ
//
// Render / renderproxyへの通信は発生しない。
// ============================================================

function applyTheme() {

  const doc =
    getDocument();


  if (!doc) {
    return;
  }


  // ----------------------------------------------------------
  // 古いCSSを削除
  // ----------------------------------------------------------

  const oldTheme =
    doc.getElementById(
      "ijiru-live-theme"
    );


  if (
    oldTheme
  ) {

    oldTheme.remove();

  }


  // ----------------------------------------------------------
  // 暗さ
  // ----------------------------------------------------------

  const dark =
    Math.max(
      0,
      Math.min(
        100,

        Number(
          darkness.value
        )
      )
    )
    /
    100;


  // ----------------------------------------------------------
  // 背景
  // ----------------------------------------------------------

  let backgroundImage =
    "none";


  if (
    wallpaper
  ) {

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


  // ----------------------------------------------------------
  // CSS
  // ----------------------------------------------------------

  const style =
    doc.createElement(
      "style"
    );


  style.id =
    "ijiru-live-theme";


  style.textContent = \`

html {

  background-color:
    #111
    !important;


  background-image:
    \${backgroundImage}
    !important;


  background-size:
    cover
    !important;


  background-position:
    center center
    !important;


  background-repeat:
    no-repeat
    !important;


  background-attachment:
    fixed
    !important;

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
    doc.head
    ||
    doc.documentElement
  )
  .appendChild(
    style
  );


  // ----------------------------------------------------------
  // 背景除去
  // ----------------------------------------------------------

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


      // --------------------------------------------------------
      // 前回の加工を解除
      // --------------------------------------------------------

      if (
        element.dataset
          .ijiruOriginalBackground
          !== undefined
      ) {

        const original =
          element.dataset
            .ijiruOriginalBackground;


        if (
          original
        ) {

          element.style
            .backgroundColor =
              original;

        }

        else {

          element.style
            .removeProperty(
              "background-color"
            );

        }


        delete element.dataset
          .ijiruOriginalBackground;

      }


      // --------------------------------------------------------
      // OFFならここまで
      // --------------------------------------------------------

      if (
        !removeBackground
          .checked
      ) {

        return;

      }


      // --------------------------------------------------------
      // 消さないもの
      // --------------------------------------------------------

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


      const background =
        computed
          .backgroundColor;


      // --------------------------------------------------------
      // 元から透明なら何もしない
      // --------------------------------------------------------

      if (
        background ===
          "transparent"

        ||

        background ===
          "rgba(0, 0, 0, 0)"
      ) {

        return;

      }


      // --------------------------------------------------------
      // 元のinline値を記録
      // --------------------------------------------------------

      element.dataset
        .ijiruOriginalBackground =

          element.style
            .backgroundColor
          ||
          "";


      // --------------------------------------------------------
      // 透明化
      // --------------------------------------------------------

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
// ここだけrenderproxyへ通信。
// ============================================================

async function openPage(
  force = false
) {

  const url =
    normalizeURL(
      urlInput.value
    );


  if (
    !url
  ) {

    return;

  }


  currentURL =
    url;


  urlInput.value =
    url;


  statusElement
    .textContent =
      "取得中...";


  try {

    const query =
      new URLSearchParams({

        url:
          url,

        force:
          force
            ?
            "1"
            :
            "0"

      });


    const response =
      await fetch(

        "/api/page?"
        +
        query.toString()

      );


    const result =
      await response.json();


    if (
      !response.ok
    ) {

      throw new Error(

        result.error
        ||
        "取得できませんでした"

      );

    }


    // ----------------------------------------------------------
    // iframeロード完了後にテーマ適用
    // ----------------------------------------------------------

    viewer.onload =
      () => {

        applyTheme();


        statusElement
          .textContent =

            "表示中: "
            +
            currentURL
            +
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

        "エラー: "
        +
        error.message;

  }

}


// ============================================================
// 背景画像
// ============================================================

wallpaperInput
  .addEventListener(

    "change",

    () => {


      const file =
        wallpaperInput
          .files[0];


      if (
        !file
      ) {

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
            ここではページを
            再取得しない
          */

          applyTheme();

        };


      reader.readAsDataURL(
        file
      );

    }

  );


// ============================================================
// 色
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

          darkness.value
          +
          "%";


      applyTheme();

    }

  );


// ============================================================
// 背景除去ON/OFF
// ============================================================

removeBackground
  .addEventListener(

    "change",

    applyTheme

  );


// ============================================================
// 壁紙解除
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

      openPage(
        false
      );

    }

  );


// ============================================================
// 強制再取得
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
// 閲覧モード
//
// UIを消すだけ。
// 状態は絶対に保存しない。
// ページ再読み込みで復活する。
// ============================================================

document
  .getElementById(
    "viewMode"
  )
  .addEventListener(

    "click",

    () => {

      toolbar.style.display =
        "none";

    }

  );


// ============================================================
// 初期化
// ============================================================

loadSettings();


darknessValue
  .textContent =

    darkness.value
    +
    "%";

</script>

</body>

</html>
`);

});


// ============================================================
// ページ取得API
// ============================================================

app.get(
  "/api/page",

  async (
    req,
    res
  ) => {

    try {

      const url =
        req.query.url;


      const force =
        req.query.force ===
        "1";


      // --------------------------------------------------------
      // URLチェック
      // --------------------------------------------------------

      if (
        !url
      ) {

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
          new URL(
            url
          );

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
          "http:"

        &&

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


      // --------------------------------------------------------
      // キャッシュ
      // --------------------------------------------------------

      const cached =
        cache.get(
          url
        );


      if (
        !force
        &&
        cached
        &&
        Date.now() -
          cached.time
          <
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


      // --------------------------------------------------------
      // renderproxy形式
      // --------------------------------------------------------

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
        UPSTREAM
        +
        encoded;


      console.log(
        "FETCH:",
        proxyURL
      );


      // --------------------------------------------------------
      // renderproxyから取得
      // --------------------------------------------------------

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


      // --------------------------------------------------------
      // Rate limit
      // --------------------------------------------------------

      if (
        response.status ===
        429
      ) {

        const retryAfter =
          response.headers.get(
            "retry-after"
          );


        let message =
          "renderproxyがアクセス制限中です。";


        if (
          retryAfter
        ) {

          message +=
            " Retry-After: "
            +
            retryAfter;

        }


        return res
          .status(429)
          .json({

            error:
              message

          });

      }


      // --------------------------------------------------------
      // その他
      // --------------------------------------------------------

      if (
        !response.ok
      ) {

        return res
          .status(502)
          .json({

            error:

              "renderproxy returned HTTP "
              +
              response.status

          });

      }


      let html =
        await response.text();


      // --------------------------------------------------------
      // 相対URL対策
      // --------------------------------------------------------

      const base =
        '<base href="'
        +
        escapeHTML(
          url
        )
        +
        '">';


      if (
        /<head(?:\\s[^>]*)?>/i
          .test(
            html
          )
      ) {

        html =
          html.replace(

            /<head([^>]*)>/i,

            "<head$1>"
            +
            base

          );

      }

      else {

        html =
          base
          +
          html;

      }


      // --------------------------------------------------------
      // キャッシュ
      // --------------------------------------------------------

      cache.set(
        url,

        {

          time:
            Date.now(),

          html:
            html

        }
      );


      // --------------------------------------------------------
      // 古いキャッシュ削除
      // --------------------------------------------------------

      for (
        const [key, value]
        of cache
      ) {

        if (
          Date.now()
          -
          value.time
          >
          CACHE_TIME
        ) {

          cache.delete(
            key
          );

        }

      }


      // --------------------------------------------------------
      // 返却
      // --------------------------------------------------------

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

            "サーバーエラー: "
            +
            error.message

        });

    }

  }
);


// ============================================================
// HTML Escape
// ============================================================

function escapeHTML(
  value
) {

  return String(
    value
  )

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
      "Ijiru Viewer v5"
    );


    console.log(
      "PORT:",
      PORT
    );

  }
);
