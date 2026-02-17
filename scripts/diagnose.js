/**
 * diagnose.js — イベントデータ品質診断ツール
 *
 * 使い方:
 *   node scripts/diagnose.js                # localhost:8787 から取得
 *   node scripts/diagnose.js --url URL      # 指定URLから取得
 *   node scripts/diagnose.js --file PATH    # JSONファイルから読み込み
 *   node scripts/diagnose.js --ward 千代田区  # 特定区のみ
 *   node scripts/diagnose.js --verbose      # 全件出力 (OKも含む)
 */

const http = require("http");
const https = require("https");
const fs = require("fs");

// --- CLI args ---
const args = process.argv.slice(2);
function getArg(name) {
  const i = args.indexOf(name);
  return i >= 0 && i + 1 < args.length ? args[i + 1] : null;
}
const hasFlag = (name) => args.includes(name);

const apiUrl = getArg("--url") || "http://localhost:8787/api/events?days=30";
const filePath = getArg("--file");
const wardFilter = getArg("--ward");
const verbose = hasFlag("--verbose");

// =============================================================
// 診断ルール
// =============================================================

/** タイトル問題 */
const titleRules = [
  // --- 非イベントページ ---
  { re: /おたより|お便り|たより|だより/, tag: "非イベント", reason: "おたより/PDF配布ページ", fix: "titleDenyReに追加" },
  { re: /施設案内|施設紹介|施設のご案内/, tag: "非イベント", reason: "施設紹介ページ", fix: "titleDenyReに追加" },
  { re: /サイトマップ|アクセシビリティ|個人情報|プライバシー/, tag: "サイト構造", reason: "サイト共通ページ", fix: "titleDenyReに追加" },
  { re: /リンク集|関連リンク/, tag: "サイト構造", reason: "リンク集ページ", fix: "titleDenyReに追加" },
  { re: /Q＆A|Q&A|よくある質問/, tag: "非イベント", reason: "FAQページ", fix: "titleDenyReに追加" },
  { re: /^お知らせ$|^イベント一覧$|^新着情報$/, tag: "サイト構造", reason: "一覧/トップページ", fix: "titleDenyReに追加" },
  { re: /臨時休館|休館のお知らせ/, tag: "休館情報", reason: "休館案内", fix: "titleDenyReに追加" },
  { re: /への地図|への行き方|アクセス$/, tag: "非イベント", reason: "アクセスページ", fix: "titleDenyReに追加" },
  { re: /活動紹介|活動のご紹介/, tag: "非イベント", reason: "活動紹介ページ", fix: "titleDenyReに追加" },
  { re: /居場所づくり事業|中高生タイム$/, tag: "非イベント", reason: "事業紹介（単発イベントではない）", fix: "titleDenyReに追加" },
  // --- 非子ども向け ---
  { re: /フレイル|介護予防|認知症.*サポーター|高齢者.*教室/, tag: "対象外", reason: "高齢者向けイベント", fix: "titleDenyReに追加" },
  { re: /消費者講座|消費者団体|多重債務/, tag: "対象外", reason: "一般成人向け講座", fix: "titleDenyReに追加" },
  { re: /ゲートキーパー|男女共同参画|有償刊行物|行政評価/, tag: "対象外", reason: "行政・一般向け", fix: "titleDenyReに追加" },
  { re: /選挙|常任委員会|議会/, tag: "対象外", reason: "行政・政治", fix: "titleDenyReに追加" },
  // --- 制度案内 ---
  { re: /児童手当|入園募集|入園の.*募集|待機児童|定員状況/, tag: "制度案内", reason: "制度・手続きページ", fix: "titleDenyReに追加" },
  { re: /病児.*保育|保育所.*定員|申込.*流れ|仮申込/, tag: "制度案内", reason: "保育制度ページ", fix: "titleDenyReに追加" },
  // --- 防災 ---
  { re: /大きな地震|防災|避難場所|防犯/, tag: "防災", reason: "防災・防犯情報", fix: "titleDenyReに追加" },
];

/** 場所(venue)問題 */
const venueRules = [
  // --- フォールバック ---
  { re: /子ども関連施設$/, tag: "フォールバック", reason: "詳細ページに会場欄がない or 会場抽出失敗", fix: "会場抽出ロジックを確認。詳細ページのHTML構造を調べる" },
  { re: /子育て関連施設$/, tag: "フォールバック", reason: "同上", fix: "同上" },
  { re: /子育て施設$/, tag: "フォールバック", reason: "同上（千代田区supplement）", fix: "同上" },
  // --- 対象者混入 ---
  { re: /^どなたでも/, tag: "対象者混入", reason: "対象者テキストが会場欄に入った", fix: "isLikelyAudienceTextに追加 or 会場抽出のh2マッチを修正" },
  { re: /^(?:無料|有料|なし)$/, tag: "費用混入", reason: "費用テキストが会場欄に入った", fix: "sanitizeVenueTextで除外" },
  { re: /^(?:小学|中学|高校|未就学|[0-9０-９]+歳)/, tag: "対象者混入", reason: "対象者テキストが会場欄に入った", fix: "isLikelyAudienceTextに追加" },
  { test: (v) => /^乳幼児/.test(v) && !/ひろば|プラザ|センター|館/.test(v), tag: "対象者混入", reason: "対象者テキストが会場欄に入った", fix: "isLikelyAudienceTextに追加" },
  { re: /在住.*在勤|在勤.*在学|区民の方/, tag: "対象者混入", reason: "対象者テキストが会場欄に入った", fix: "isLikelyAudienceTextに追加" },
  // --- 住所・連絡先混入 ---
  { re: /〒\d{3}/, tag: "住所混入", reason: "郵便番号が会場名に含まれている", fix: "sanitizeVenueTextの郵便番号除去を確認" },
  { re: /☎|TEL|FAX|電話番号/, tag: "連絡先混入", reason: "電話番号が会場名に含まれている", fix: "sanitizeVenueTextの電話番号除去を確認" },
  { re: /東京都.{2,6}区.{2,20}\d+[-ー－]/, tag: "住所混入", reason: "住所が会場名に含まれている", fix: "sanitizeVenueTextのleadingFacility切り出しを確認" },
  // --- 長すぎ ---
  { test: (v) => v.length > 50, tag: "長すぎ", reason: "説明文やコース情報が会場に入っている", fix: "sanitizeVenueTextの長さ制限 or 切り出しパターンを追加" },
  // --- 文章混入 ---
  { re: /ましょう|ください|します[。、）]?$/, tag: "文章混入", reason: "タイトルや説明文が会場に入った", fix: "sanitizeVenueTextで文末パターンを除去" },
  { re: /部$|課$|係$|担当$/, tag: "部署名", reason: "担当部署が会場名として入った", fix: "isLikelyDepartmentVenueで除去 or sanitizeVenueTextの部署チェック" },
  // --- テンプレート ---
  { re: /PDF|ページ番号/, tag: "テンプレ混入", reason: "HTMLテンプレート文言が混入", fix: "sanitizeVenueTextのテンプレ除去パターンを確認" },
  { re: /^★|^●|^※/, tag: "記号開始", reason: "注釈記号で始まる → 注記が会場に入った", fix: "sanitizeVenueTextで記号開始を除去" },
  // --- スケジュール混入 ---
  { re: /^\d+月\d+日/, tag: "日付混入", reason: "日付テキストが会場欄に入った", fix: "sanitizeVenueTextで月日開始パターンを除去" },
];

/** 座標・住所チェック */
function checkGeo(ev) {
  const issues = [];
  if (ev.lat == null || ev.lng == null) {
    issues.push({
      tag: "座標なし",
      reason: "ジオコーディング失敗 or 住所抽出失敗",
      fix: "buildGeoCandidatesの候補を確認。会場名・住所テキストを確認",
    });
  } else {
    // 東京23区の大まかな範囲: lat 35.5-35.85, lng 139.5-139.95
    if (ev.lat < 35.5 || ev.lat > 35.9 || ev.lng < 139.4 || ev.lng > 140.0) {
      issues.push({
        tag: "座標異常",
        reason: `座標(${ev.lat.toFixed(4)}, ${ev.lng.toFixed(4)})が東京23区外`,
        fix: "ジオコーディング結果のsanitizeWardPointを確認",
      });
    }
  }
  return issues;
}

/** URL パターンチェック */
function checkUrl(ev) {
  const issues = [];
  if (!ev.url) {
    issues.push({ tag: "URLなし", reason: "ソースURLが空", fix: "コレクターのURL生成を確認" });
  }
  return issues;
}

/** 重複チェック用 */
function findDuplicates(items) {
  const byTitle = {};
  for (const ev of items) {
    const key = `${ev.source_label}:${ev.title}:${ev.starts_at?.slice(0, 10)}`;
    if (!byTitle[key]) byTitle[key] = [];
    byTitle[key].push(ev);
  }
  const dups = [];
  for (const [key, group] of Object.entries(byTitle)) {
    if (group.length > 1) {
      const urls = [...new Set(group.map((e) => e.url))];
      if (urls.length > 1) {
        dups.push({
          title: group[0].title,
          ward: group[0].source_label,
          date: group[0].starts_at?.slice(0, 10),
          count: group.length,
          urls,
        });
      }
    }
  }
  return dups;
}

// =============================================================
// データ取得
// =============================================================
function fetchData(url) {
  return new Promise((resolve, reject) => {
    const get = url.startsWith("https") ? https.get : http.get;
    get(url, { timeout: 300000 }, (res) => {
      let body = "";
      res.on("data", (c) => (body += c));
      res.on("end", () => {
        try {
          resolve(JSON.parse(body));
        } catch (e) {
          reject(new Error(`JSON parse error: ${e.message}`));
        }
      });
    }).on("error", reject);
  });
}

// =============================================================
// メイン
// =============================================================
async function main() {
  let data;
  if (filePath) {
    data = JSON.parse(fs.readFileSync(filePath, "utf8"));
  } else {
    console.log(`データ取得中: ${apiUrl}`);
    data = await fetchData(apiUrl);
  }

  let items = data.items || [];
  if (wardFilter) {
    items = items.filter((e) => e.source_label === wardFilter);
  }
  console.log(`\n対象: ${items.length} 件${wardFilter ? ` (${wardFilter})` : ""}\n`);

  // --- 各イベントを診断 ---
  const results = []; // { ward, ev, issues: [{ field, tag, reason, fix }] }

  for (const ev of items) {
    const issues = [];

    // タイトルチェック
    for (const rule of titleRules) {
      if (rule.re && rule.re.test(ev.title)) {
        issues.push({ field: "title", tag: rule.tag, reason: rule.reason, fix: rule.fix });
        break;
      }
    }

    // 場所チェック
    for (const rule of venueRules) {
      const matched = rule.re ? rule.re.test(ev.venue_name) : rule.test ? rule.test(ev.venue_name) : false;
      if (matched) {
        issues.push({ field: "venue", tag: rule.tag, reason: rule.reason, fix: rule.fix });
        break;
      }
    }

    // 座標チェック
    for (const issue of checkGeo(ev)) {
      issues.push({ field: "geo", ...issue });
    }

    // URLチェック
    for (const issue of checkUrl(ev)) {
      issues.push({ field: "url", ...issue });
    }

    results.push({ ward: ev.source_label, ev, issues });
  }

  // --- 重複チェック ---
  const dups = findDuplicates(items);

  // --- 集計 ---
  const summary = {}; // ward -> { ok, problems: { tag -> [{ev, issue}] } }
  for (const r of results) {
    if (!summary[r.ward]) summary[r.ward] = { ok: 0, total: 0, problems: {} };
    summary[r.ward].total++;
    if (r.issues.length === 0) {
      summary[r.ward].ok++;
    } else {
      for (const issue of r.issues) {
        const key = `${issue.field}:${issue.tag}`;
        if (!summary[r.ward].problems[key]) {
          summary[r.ward].problems[key] = { field: issue.field, tag: issue.tag, reason: issue.reason, fix: issue.fix, items: [] };
        }
        summary[r.ward].problems[key].items.push(r.ev);
      }
    }
  }

  // --- 出力 ---
  const wards = Object.keys(summary).sort();
  let totalOk = 0;
  let totalProblems = 0;

  for (const ward of wards) {
    const s = summary[ward];
    const problemCount = Object.values(s.problems).reduce((sum, p) => sum + p.items.length, 0);
    totalOk += s.ok;
    totalProblems += problemCount;

    if (problemCount === 0 && !verbose) continue;

    console.log(`${"=".repeat(60)}`);
    console.log(`${ward}  (OK: ${s.ok} / 問題: ${problemCount} / 全${s.total}件)`);
    console.log(`${"=".repeat(60)}`);

    const sortedProblems = Object.values(s.problems).sort((a, b) => b.items.length - a.items.length);
    for (const p of sortedProblems) {
      console.log(`\n  [${p.field}] ${p.tag} (${p.items.length}件)`);
      console.log(`    原因: ${p.reason}`);
      console.log(`    対策: ${p.fix}`);
      console.log(`    例:`);
      const examples = p.items.slice(0, 3);
      for (const ev of examples) {
        console.log(`      - title: "${ev.title.slice(0, 60)}"`);
        console.log(`        venue: "${(ev.venue_name || "").slice(0, 50)}"`);
        console.log(`        url:   ${ev.url || "(なし)"}`);
      }
      if (p.items.length > 3) {
        console.log(`      ... 他${p.items.length - 3}件`);
      }
    }
    console.log("");
  }

  // --- 重複レポート ---
  if (dups.length > 0) {
    console.log(`${"=".repeat(60)}`);
    console.log(`重複検出 (同じ区・タイトル・日付で異なるURL: ${dups.length}件)`);
    console.log(`${"=".repeat(60)}`);
    for (const d of dups.slice(0, 10)) {
      console.log(`  ${d.ward} | "${d.title.slice(0, 50)}" | ${d.date} | ${d.count}件`);
      for (const u of d.urls.slice(0, 3)) console.log(`    ${u}`);
    }
    if (dups.length > 10) console.log(`  ... 他${dups.length - 10}件`);
    console.log("");
  }

  // --- サマリー ---
  console.log(`${"=".repeat(60)}`);
  console.log(`サマリー`);
  console.log(`${"=".repeat(60)}`);
  console.log(`  全イベント: ${items.length}`);
  console.log(`  OK:         ${totalOk}`);
  console.log(`  問題あり:   ${totalProblems}`);
  console.log(`  重複:       ${dups.length}組`);

  // 問題タイプ別集計
  const byType = {};
  for (const r of results) {
    for (const issue of r.issues) {
      const key = `${issue.field}:${issue.tag}`;
      if (!byType[key]) byType[key] = { field: issue.field, tag: issue.tag, count: 0 };
      byType[key].count++;
    }
  }
  const sortedTypes = Object.values(byType).sort((a, b) => b.count - a.count);
  if (sortedTypes.length > 0) {
    console.log(`\n  問題タイプ別:`);
    for (const t of sortedTypes) {
      console.log(`    ${t.field}:${t.tag}  ${t.count}件`);
    }
  }
  console.log("");
}

main().catch((e) => {
  console.error("エラー:", e.message);
  process.exit(1);
});
