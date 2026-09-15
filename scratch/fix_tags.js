const fs = require("fs");
const path = require("path");

const files = [
  "components/n11/n11-calculator-client.tsx",
  "components/pazarama/pazarama-calculator-client.tsx",
  "components/trendruum/trendruum-calculator-client.tsx",
  "components/idefix/idefix-calculator-client.tsx",
];

for (const f of files) {
  const filePath = path.resolve(f);
  let content = fs.readFileSync(filePath, "utf8");

  // Fix the double closing div
  const target = `                    <p className="text-xs text-muted-foreground mt-1">Sipariş başı sabit gider (0 yapabilirsin)</p>
                  </div>
                </div>

                                  <div className="md:col-span-2">`;

  const replacement = `                    <p className="text-xs text-muted-foreground mt-1">Sipariş başı sabit gider (0 yapabilirsin)</p>
                  </div>
                  <div className="md:col-span-2">`;

  // We need to handle CRLF and whitespace variations
  const regex = /<p className="text-xs text-muted-foreground mt-1">Sipariş başı sabit gider \(0 yapabilirsin\)<\/p>\s*<\/div>\s*<\/div>\s*<div className="md:col-span-2">/;

  if (regex.test(content)) {
    content = content.replace(
      regex,
      `<p className="text-xs text-muted-foreground mt-1">Sipariş başı sabit gider (0 yapabilirsin)</p>\n                  </div>\n                  <div className="md:col-span-2">`
    );
    fs.writeFileSync(filePath, content, "utf8");
    console.log(`Fixed tags in ${f}`);
  } else {
    console.warn(`Could not find pattern in ${f}`);
  }
}
