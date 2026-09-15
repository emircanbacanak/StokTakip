const fs = require("fs");
const file = "components/idefix/idefix-calculator-client.tsx";
let c = fs.readFileSync(file, "utf8");
c = c.replace(
  /import \{\s*calcMarketplaceShippingCost,\s*checkPriceOptimization,\s*MARKETPLACE_CARGO_COMPANIES,\s*type NetProfitInput,\s*\} from "@\/lib\/marketplace-cargo";/,
  `import {
  calcIdefixShippingCost as calcMarketplaceShippingCost,
  IDEFIX_CARGO_COMPANIES as MARKETPLACE_CARGO_COMPANIES,
} from "@/lib/idefix-cargo";
import {
  checkPriceOptimization,
  type NetProfitInput,
} from "@/lib/marketplace-cargo";`
);
fs.writeFileSync(file, c, "utf8");
console.log("Idefix imports updated successfully");
