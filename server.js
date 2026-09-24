import express from "express";

const app = express();
const PORT = process.env.PORT || 3000;

const UPSTREAM =
  "https://renderproxy-pre1.onrender.com/";

app.use(express.json({
  limit: "25mb"
}));


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
    -apple-system,
    sans-serif;
}


/* =========================================
   操作画面
========================================= */

#toolbar {
  flex: 0 0 auto;

  padding: 8px;

  background: #181818;

  border-bottom:
    1px solid #333;
}


/* URL */

#urlRow {
  display: flex;
  gap: 6px;
}

#url {
  flex: 1;
  min-width: 0;

  padding: 9px 11px;

  background: #292929;
  color: white;

  border:
    1px solid #444;

  border-radius: 7px;

  outline: none;

  font-size: 15px;
}

#url:focus {
  border-color: #55aaff;
}


/* ボタン */

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

#openButton {
  background: #1473e6;

  border-color:
    #1473e6;
}


/* =========================================
   設定
========================================= */

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


/* =========================================
   ステータス
========================================= */

#status {
  margin-top: 6px;

  min-height: 17px;

  color: #aaa;

  font-size: 12px;
}


/* =========================================
   ブラウザ部分
========================================= */

#viewer {
  flex: 1;

  width: 100%;

  border: 0;

  background: #111;
}


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

    <button id="openButton">
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
        id="removeBackgrounds"
        type="checkbox"
        checked
      >

    </label>


    <button id="removeWallpaper">
      画像を外す
    </button>


    <button id="resetButton">
      リセット
    </button>

  </div>


  <div id="status">
    URLと背景画像を指定してください
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

const statusElement =
  document.getElementById("status");

const textColor =
  document.getElementById("textColor");

const linkColor =
  document.getElementById("linkColor");

const wallpaperInput =
  document.getElementById("wallpaper");

const darkness =
  document.getElementById("darkness");

const darknessValue =
  document.getElementById(
    "darknessValue"
  );

const removeBackgrounds =
  document.getElementById(
    "removeBackgrounds"
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
    !/^https?:\\/\\//i.test(url)
  ) {
    url =
      "https://" + url;
  }

  return url;

}


// ============================================================
// 設定
// ============================================================

function getSettings() {

  return {

    textColor:
      textColor.value,

    linkColor:
      linkColor.value,

    darkness:
      Number(
        darkness.value
      ),

    removeBackgrounds:
      removeBackgrounds.checked,

    wallpaper:
      wallpaper

  };

}


function saveSettings() {

  const settings =
    getSettings();

  /*
    画像は容量が大きいため
    localStorageには保存しない
  */

  delete settings.wallpaper;


  localStorage.setItem(
    "ijiru-settings-v2",
    JSON.stringify(settings)
  );

}


function loadSettings() {

  try {

    const data =
      localStorage.getItem(
        "ijiru-settings-v2"
      );

    if (!data) {
      return;
    }


    const settings =
      JSON.parse(data);


    if (settings.textColor) {

      textColor.value =
        settings.textColor;

    }


    if (settings.linkColor) {

      linkColor.value =
        settings.linkColor;

    }


    if (
      settings.darkness !==
      undefined
    ) {

      darkness.value =
        settings.darkness;

    }


    if (
      settings.removeBackgrounds !==
      undefined
    ) {

      removeBackgrounds.checked =
        settings.removeBackgrounds;

    }

  } catch (error) {

    console.error(error);

  }

}


// ============================================================
// ページを取得
// ============================================================

async function openPage() {

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
    "取得・加工中...";


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


    const html =
      await response.text();


    if (!response.ok) {

      throw new Error(html);

    }


    viewer.srcdoc =
      html;


    statusElement.textContent =
      "表示中: " + url;


    saveSettings();


  } catch (error) {

    console.error(error);

    statusElement.textContent =
      "エラー: " +
      error.message;

  }

}


// ============================================================
// 壁紙選択
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


    /*
      Renderへ巨大な画像を送ると
      重くなるため軽い上限
    */

    if (
      file.size >
      12 * 1024 * 1024
    ) {

      alert(
        "画像が大きすぎます。12MB以下にしてください。"
      );

      wallpaperInput.value =
        "";

      return;
    }


    const reader =
      new FileReader();


    reader.onload =
      () => {

        wallpaper =
          reader.result;

        if (currentURL) {

          openPage();

        }

      };


    reader.readAsDataURL(file);

  }
);


// ============================================================
// UI
// ============================================================

darkness.addEventListener(
  "input",
  () => {

    darknessValue.textContent =
      darkness.value +
      "%";

  }
);


darkness.addEventListener(
  "change",
  () => {

    saveSettings();

    if (currentURL) {
      openPage();
    }

  }
);


textColor.addEventListener(
  "change",
  () => {

    saveSettings();

    if (currentURL) {
      openPage();
    }

  }
);


linkColor.addEventListener(
  "change",
  () => {

    saveSettings();

    if (currentURL) {
      openPage();
    }

  }
);


removeBackgrounds.addEventListener(
  "change",
  () => {

    saveSettings();

    if (currentURL) {
      openPage();
    }

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


document
  .getElementById(
    "resetButton"
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

      darknessValue.textContent =
        "35%";

      removeBackgrounds.checked =
        true;

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


// ============================================================
// 起動時
// ============================================================

loadSettings();

darknessValue.textContent =
  darkness.value +
  "%";

</script>

</body>
</html>
`);
});


// ============================================================
// ページ加工API
// ============================================================

app.post(
  "/api/page",
  async (req, res) => {

    try {

      const {

        url,

        textColor =
          "#eeeeee",

        linkColor =
          "#65caff",

        darkness =
          35,

        removeBackgrounds =
          true,

        wallpaper =
          ""

      } = req.body;


      // ------------------------------------------
      // URLチェック
      // ------------------------------------------

      if (!url) {

        return res
          .status(400)
          .send(
            "URLが指定されていません"
          );

      }


      let parsedURL;


      try {

        parsedURL =
          new URL(url);

      } catch {

        return res
          .status(400)
          .send(
            "URLが正しくありません"
          );

      }


      if (
        parsedURL.protocol !==
          "http:" &&
        parsedURL.protocol !==
          "https:"
      ) {

        return res
          .status(400)
          .send(
            "HTTP/HTTPSのみ対応しています"
          );

      }


      // ------------------------------------------
      // renderproxy URL
      // ------------------------------------------

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
        "Fetching:",
        proxyURL
      );


      // ------------------------------------------
      // 取得
      // ------------------------------------------

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
            "renderproxy error: HTTP " +
            response.status
          );

      }


      let html =
        await response.text();


      // ------------------------------------------
      // 設定を安全化
      // ------------------------------------------

      const safeText =
        validateColor(
          textColor,
          "#eeeeee"
        );


      const safeLink =
        validateColor(
          linkColor,
          "#65caff"
        );


      const safeDarkness =
        Math.max(
          0,
          Math.min(
            100,
            Number(darkness) ||
            0
          )
        ) / 100;


      // ------------------------------------------
      // 背景画像
      // ------------------------------------------

      let wallpaperCSS = "";


      if (
        typeof wallpaper ===
          "string" &&

        /^data:image\\/[a-zA-Z0-9.+-]+;base64,/.test(
          wallpaper
        )
      ) {

        wallpaperCSS = `

background-image:

  linear-gradient(
    rgba(
      0,
      0,
      0,
      ${safeDarkness}
    ),

    rgba(
      0,
      0,
      0,
      ${safeDarkness}
    )
  ),

  url("${wallpaper}")

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


      // ------------------------------------------
      // 背景除去CSS
      // ------------------------------------------

      let backgroundRemovalCSS =
        "";


      if (removeBackgrounds) {

        backgroundRemovalCSS = `

body,
main,
article,
section {
  background-color:
    transparent !important;
}

`;

      }


      // ------------------------------------------
      // 注入するもの
      // ------------------------------------------

      const injection = `

<base href="${escapeHTML(url)}">


<style id="ijiru-theme">

/*
 ==============================================
 最下層を壁紙にする
 ==============================================
*/

html {

  background-color:
    #111 !important;

  ${wallpaperCSS}

}


/*
 body自身は透明にして
 html側の壁紙を見せる
*/

body {

  background-color:
    transparent !important;

  color:
    ${safeText}
    !important;

}


/*
 ==============================================
 サイトの大きな背景を透明化
 ==============================================
*/

${backgroundRemovalCSS}


/*
 ==============================================
 文字
 ==============================================
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
 ==============================================
 リンク
 ==============================================
*/

a,
a:link,
a:visited {

  color:
    ${safeLink}
    !important;

}


/*
 ==============================================
 フォーム
 ==============================================
*/

input,
textarea,
select,
button {

  color:
    ${safeText}
    !important;

}


/*
 ==============================================
 背景画像を
 img等には影響させない
 ==============================================
*/

img,
picture,
video,
canvas,
svg {

  color-scheme:
    normal;

}

</style>


<script id="ijiru-background-script">

(() => {

  const REMOVE_BACKGROUNDS =
    ${removeBackgrounds ? "true" : "false"};


  if (!REMOVE_BACKGROUNDS) {

    return;

  }


  /*
   ============================================
   背景色を持っている要素を調べる
   ============================================
  */

  function removeBackground(
    element
  ) {

    /*
      画像・動画・入力欄などは
      触らない
    */

    if (
      element.matches(
        "img, picture, video, canvas, svg, input, textarea, select, button"
      )
    ) {

      return;

    }


    const style =
      getComputedStyle(
        element
      );


    const color =
      style.backgroundColor;


    /*
      完全透明なら元から背景なし
    */

    if (
      color ===
        "rgba(0, 0, 0, 0)" ||

      color ===
        "transparent"
    ) {

      return;

    }


    /*
      背景色だけ透明化。

      background-image は
      サイトの画像である可能性があるため
      消さない。
    */

    element.style.setProperty(
      "background-color",
      "transparent",
      "important"
    );

  }


  function processPage() {

    document
      .querySelectorAll("*")
      .forEach(
        removeBackground
      );

  }


  /*
    最初に実行
  */

  processPage();


  /*
    JavaScriptで後から追加された
    要素についても処理
  */

  const observer =
    new MutationObserver(
      mutations => {

        for (
          const mutation
          of mutations
        ) {

          for (
            const node
            of mutation.addedNodes
          ) {

            if (
              node.nodeType !==
              Node.ELEMENT_NODE
            ) {

              continue;

            }


            removeBackground(
              node
            );


            node
              .querySelectorAll("*")
              .forEach(
                removeBackground
              );

          }

        }

      }
    );


  observer.observe(
    document.documentElement,
    {
      childList: true,
      subtree: true
    }
  );

})();

<\\/script>

`;


      // ------------------------------------------
      // HTMLへ注入
      // ------------------------------------------

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


      // ------------------------------------------
      // 返す
      // ------------------------------------------

      res.setHeader(
        "Cache-Control",
        "no-store"
      );


      res
        .type("html")
        .send(html);


    } catch (error) {

      console.error(
        error
      );


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
// 色チェック
// ============================================================

function validateColor(
  value,
  fallback
) {

  if (
    typeof value !==
    "string"
  ) {

    return fallback;

  }


  if (
    /^#[0-9a-fA-F]{6}$/
      .test(value)
  ) {

    return value;

  }


  return fallback;

}


// ============================================================
// HTMLエスケープ
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
// 起動
// ============================================================

app.listen(
  PORT,
  () => {

    console.log(
      "Ijiru Viewer started:",
      PORT
    );

  }
);
