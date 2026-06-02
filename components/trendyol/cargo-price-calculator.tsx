"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Truck, Package, Calculator } from "lucide-react";

// Trendyol anlaşmalı kargo fiyatları (KDV HARİÇ, TL) - 22 Mayıs 2026
// Sütunlar: Aras, DHL, KolayGelsin, PTT, Surat, TEX, Yurtici, CEVATedarik, CEVA, Horoz
const CARGO_PRICES: Record<number, number[]> = {
  0: [83.93, 92.99, 91.99, 77.54, 89.71, 77.54, 112.77, 468.62, 651.74, 567.76],
  1: [83.93, 92.99, 91.99, 77.54, 89.71, 77.54, 112.77, 468.62, 651.74, 567.76],
  2: [83.93, 92.99, 91.99, 77.54, 89.71, 77.54, 112.77, 468.62, 651.74, 567.76],
  3: [95.12, 103.99, 101.99, 96.00, 99.96, 93.63, 120.56, 468.62, 651.74, 567.76],
  4: [103.68, 116.99, 112.99, 96.00, 109.30, 101.46, 123.15, 468.62, 651.74, 567.76],
  5: [111.17, 129.99, 121.99, 100.55, 114.94, 107.98, 142.91, 468.62, 651.74, 567.76],
  6: [121.12, 141.99, 131.99, 106.83, 126.28, 118.30, 149.82, 468.62, 651.74, 567.76],
  7: [128.46, 149.99, 140.99, 113.15, 134.85, 125.66, 169.44, 468.62, 651.74, 567.76],
  8: [137.05, 159.99, 150.99, 125.73, 143.29, 134.21, 175.96, 468.62, 651.74, 567.76],
  9: [144.91, 169.99, 159.99, 138.34, 151.87, 142.42, 186.86, 468.62, 651.74, 567.76],
  10: [153.48, 176.99, 170.99, 157.26, 160.43, 153.47, 195.12, 468.62, 651.74, 567.76],
  11: [161.77, 184.99, 180.99, 165.01, 171.83, 162.13, 207.75, 468.62, 651.74, 567.76],
  12: [167.73, 194.99, 191.99, 173.31, 181.55, 170.33, 220.80, 468.62, 651.74, 567.76],
  13: [175.34, 204.99, 201.99, 181.63, 188.84, 178.04, 227.79, 468.62, 651.74, 567.76],
  14: [182.10, 216.99, 212.99, 189.94, 193.44, 185.17, 245.62, 468.62, 651.74, 567.76],
  15: [188.82, 226.99, 223.99, 198.22, 200.48, 192.81, 258.72, 468.62, 651.74, 567.76],
  16: [199.40, 244.99, 234.99, 206.52, 207.26, 200.82, 266.13, 468.62, 651.74, 567.76],
  17: [209.92, 259.99, 245.99, 214.83, 218.26, 209.70, 280.92, 468.62, 651.74, 567.76],
  18: [220.51, 276.99, 256.99, 223.13, 229.26, 218.60, 294.85, 468.62, 651.74, 567.76],
  19: [231.07, 291.99, 267.99, 231.45, 240.14, 227.46, 300.97, 468.62, 651.74, 567.76],
  20: [235.60, 309.99, 278.99, 239.76, 251.15, 236.21, 307.46, 468.62, 651.74, 567.76],
  21: [247.47, 334.99, 289.99, 248.06, 262.40, 244.98, 324.89, 468.62, 651.74, 567.76],
  22: [258.31, 354.99, 300.99, 256.36, 272.64, 254.82, 334.91, 468.62, 651.74, 567.76],
  23: [269.13, 379.99, 311.99, 264.66, 282.62, 264.97, 347.55, 468.62, 651.74, 567.76],
  24: [278.75, 404.99, 322.99, 272.95, 292.72, 274.36, 354.51, 468.62, 651.74, 567.76],
  25: [288.32, 429.99, 333.99, 281.27, 302.70, 283.69, 378.43, 468.62, 651.74, 567.76],
  26: [297.56, 454.99, 344.99, 289.58, 312.42, 292.73, 413.73, 468.62, 651.74, 567.76],
  27: [306.79, 479.99, 355.99, 297.88, 322.15, 301.77, 433.31, 468.62, 651.74, 567.76],
  28: [316.06, 504.99, 366.99, 306.18, 331.87, 310.84, 452.92, 468.62, 651.74, 567.76],
  29: [325.31, 529.99, 377.99, 314.48, 341.59, 319.89, 468.61, 468.62, 651.74, 567.76],
  30: [334.54, 554.99, 388.99, 322.78, 351.32, 328.88, 473.40, 468.62, 651.74, 567.76],
  31: [345.25, 587.98, 398.99, 666.93, 420.28, 394.39, 486.99, 469.02, 658.84, 567.76],
  32: [355.95, 620.97, 408.99, 683.01, 432.43, 404.79, 500.58, 484.15, 666.11, 567.76],
  33: [366.66, 653.96, 418.99, 699.09, 444.71, 415.21, 514.17, 499.28, 673.39, 567.76],
  34: [377.36, 686.95, 428.99, 715.18, 456.87, 425.61, 527.76, 514.41, 680.86, 567.76],
  35: [388.07, 719.94, 438.99, 731.25, 469.15, 436.04, 541.35, 529.54, 688.28, 567.76],
  36: [398.78, 752.93, 448.99, 747.34, 481.30, 446.43, 554.95, 544.67, 695.95, 567.76],
  37: [409.48, 785.92, 458.99, 763.41, 493.58, 456.86, 568.54, 559.80, 703.52, 567.76],
  38: [420.19, 818.91, 468.99, 779.50, 505.86, 467.29, 582.13, 574.93, 711.22, 567.76],
  39: [430.89, 851.90, 478.99, 795.57, 518.02, 477.69, 595.72, 590.06, 719.12, 567.76],
  40: [441.60, 884.89, 488.99, 811.66, 536.06, 489.37, 609.31, 605.19, 727.08, 567.76],
  41: [452.31, 917.88, 498.99, 827.73, 548.34, 499.80, 622.90, 620.32, 734.24, 567.76],
  42: [463.01, 950.87, 508.99, 843.82, 560.76, 510.26, 636.49, 635.45, 741.71, 567.76],
  43: [473.72, 983.86, 518.99, 859.90, 573.04, 520.68, 650.08, 650.58, 749.17, 567.76],
  44: [484.42, 1016.85, 528.99, 875.98, 585.44, 531.13, 663.67, 665.71, 756.54, 567.76],
  45: [495.13, 1049.84, 538.99, 892.06, 597.86, 541.59, 677.27, 680.84, 764.21, 567.76],
  46: [505.83, 1082.83, 548.99, 908.14, 610.14, 552.02, 690.86, 695.97, 771.75, 573.58],
  47: [516.54, 1115.82, 558.99, 924.22, 622.54, 562.47, 704.45, 711.10, 779.58, 586.04],
  48: [527.25, 1148.81, 568.99, 940.31, 634.83, 572.89, 718.04, 726.23, 787.31, 598.51],
  49: [537.95, 1181.80, 578.99, 956.38, 647.24, 583.35, 731.63, 741.36, 795.21, 610.98],
  50: [548.66, 1214.79, 588.99, 972.47, 659.65, 593.80, 745.22, 756.49, 803.17, 623.45],
  51: [559.36, 1247.78, 598.99, 988.54, 671.93, 604.23, 758.81, 771.62, 849.57, 635.92],
  52: [570.07, 1280.77, 608.99, 1004.63, 684.34, 614.68, 772.40, 786.75, 858.04, 648.39],
  53: [580.77, 1313.76, 618.99, 1020.70, 696.62, 625.11, 785.99, 801.88, 866.59, 660.86],
  54: [591.48, 1346.75, 628.99, 1036.79, 709.03, 635.56, 799.58, 817.01, 875.27, 673.33],
  55: [602.19, 1379.74, 638.99, 1052.86, 721.44, 646.01, 813.18, 832.14, 883.56, 685.80],
  56: [612.89, 1412.73, 648.99, 1068.95, 733.73, 656.45, 826.77, 847.27, 887.88, 698.27],
  57: [623.60, 1445.72, 658.99, 1085.03, 746.13, 666.90, 840.36, 862.39, 890.66, 710.73],
  58: [634.30, 1478.71, 668.99, 1101.11, 758.41, 677.32, 853.95, 877.52, 893.32, 723.20],
  59: [645.01, 1511.70, 678.99, 1117.19, 770.83, 687.77, 867.54, 892.65, 895.07, 735.67],
  60: [655.72, 1544.69, 688.99, 1133.28, 783.23, 698.23, 881.13, 907.78, 895.48, 748.14],
  61: [666.42, 1577.68, 698.99, 1149.35, 795.52, 708.66, 894.72, 922.91, 896.38, 760.61],
  62: [677.13, 1610.67, 708.99, 1165.44, 807.93, 719.11, 908.31, 938.04, 897.59, 773.08],
  63: [687.83, 1643.66, 718.99, 1181.51, 820.21, 729.54, 921.90, 953.17, 898.81, 785.55],
  64: [698.54, 1676.65, 728.99, 1197.60, 832.62, 739.99, 935.50, 968.30, 901.38, 798.02],
  65: [709.24, 1709.64, 738.99, 1213.67, 845.03, 750.44, 949.09, 983.43, 901.84, 810.49],
  66: [719.95, 1742.63, 748.99, 1229.76, 857.31, 760.88, 962.68, 998.56, 915.69, 822.96],
  67: [730.66, 1775.62, 758.99, 1245.83, 869.72, 771.33, 976.27, 1013.69, 929.58, 835.43],
  68: [741.36, 1808.61, 768.99, 1261.92, 882.00, 781.75, 989.86, 1028.82, 943.43, 847.89],
  69: [752.07, 1841.60, 778.99, 1277.99, 894.42, 792.20, 1003.45, 1043.95, 957.33, 860.36],
  70: [762.77, 1874.59, 788.99, 1294.08, 906.82, 802.66, 1017.04, 1059.08, 971.18, 872.83],
  71: [773.48, 1907.58, 798.99, 1310.16, 919.10, 813.09, 1030.63, 1074.21, 985.07, 885.30],
  72: [784.19, 1940.57, 808.99, 1326.24, 931.52, 823.54, 1044.22, 1089.34, 998.92, 897.77],
  73: [794.89, 1973.56, 818.99, 1342.32, 943.80, 833.97, 1057.81, 1104.47, 1012.81, 910.24],
  74: [805.60, 2006.55, 828.99, 1358.41, 956.20, 844.42, 1071.41, 1119.60, 1026.76, 922.71],
  75: [816.30, 2039.54, 838.99, 1374.48, 968.62, 854.87, 1085.00, 1134.73, 1040.56, 935.18],
  76: [827.01, 2072.53, 848.99, 1390.57, 980.90, 865.30, 1098.59, 1149.86, 1054.50, 947.65],
  77: [837.71, 2105.52, 858.99, 1406.64, 993.31, 875.76, 1112.18, 1164.99, 1068.30, 960.12],
  78: [848.42, 2138.51, 868.99, 1422.73, 1005.59, 886.18, 1125.77, 1180.12, 1082.24, 972.58],
  79: [859.13, 2171.50, 878.99, 1438.80, 1018.00, 896.63, 1139.36, 1195.25, 1096.04, 985.05],
  80: [869.83, 2204.49, 888.99, 1454.89, 1030.41, 907.09, 1152.95, 1210.38, 1109.99, 997.52],
  81: [880.54, 2237.48, 898.99, 1470.96, 1042.69, 917.52, 1166.54, 1225.51, 1123.79, 1009.99],
  82: [891.24, 2270.47, 908.99, 1487.05, 1055.11, 927.97, 1180.13, 1240.64, 1137.73, 1022.46],
  83: [901.95, 2303.46, 918.99, 1503.13, 1067.39, 938.40, 1193.73, 1255.77, 1151.53, 1034.93],
  84: [912.65, 2336.45, 928.99, 1519.21, 1079.79, 948.85, 1207.32, 1270.90, 1165.47, 1047.40],
  85: [923.36, 2369.44, 938.99, 1535.29, 1092.21, 959.30, 1220.91, 1286.03, 1179.27, 1059.87],
  86: [934.07, 2402.43, 948.99, 1551.37, 1104.49, 969.73, 1234.50, 1301.16, 1193.22, 1072.34],
  87: [944.77, 2435.42, 958.99, 1567.45, 1116.89, 980.18, 1248.09, 1302.13, 1207.02, 1084.81],
  88: [955.48, 2468.41, 968.99, 1583.54, 1129.18, 990.61, 1261.68, 1303.23, 1220.96, 1097.28],
  89: [966.18, 2501.40, 978.99, 1599.61, 1141.59, 1001.06, 1275.27, 1304.33, 1234.85, 1109.74],
  90: [976.89, 2534.39, 988.99, 1615.70, 1154.00, 1011.51, 1288.86, 1305.43, 1248.70, 1122.21],
  91: [987.60, 2567.38, 998.99, 1631.77, 1166.28, 1021.95, 1302.45, 1306.54, 1262.60, 1134.68],
  92: [998.30, 2600.37, 1008.99, 1647.86, 1178.69, 1032.40, 1316.04, 1306.54, 1276.44, 1147.15],
  93: [1009.01, 2633.36, 1018.99, 1663.93, 1190.98, 1042.82, 1329.64, 1306.54, 1290.34, 1159.62],
  94: [1019.71, 2666.35, 1028.99, 1680.02, 1203.38, 1053.28, 1343.23, 1306.54, 1304.14, 1172.09],
  95: [1030.42, 2699.34, 1038.99, 1696.09, 1215.80, 1063.73, 1356.82, 1306.54, 1318.08, 1184.56],
  96: [1041.12, 2732.33, 1048.99, 1712.18, 1228.08, 1074.16, 1370.41, 1307.64, 1331.88, 1197.03],
  97: [1051.83, 2765.32, 1058.99, 1728.26, 1240.48, 1084.61, 1384.00, 1308.74, 1345.83, 1209.50],
  98: [1062.54, 2798.31, 1068.99, 1744.34, 1252.76, 1095.04, 1397.59, 1309.84, 1359.63, 1221.97],
  99: [1073.24, 2831.30, 1078.99, 1760.42, 1265.18, 1105.49, 1411.18, 1310.95, 1367.90, 1234.43],
  100: [1083.95, 2864.29, 1088.99, 1776.50, 1277.58, 1115.94, 1424.77, 1312.05, 1369.18, 1246.90],
  // 101+ desiden itibaren PTT (idx=3) ve CEVA (idx=8) fiyatı yok
  // Sıra: Aras, DHL, KolayGelsin, PTT(null), Sürat, TEX, Yurtiçi, CEVATedarik, CEVA(null), Horoz
  101: [1094.65, 2897.28, 1098.99, null, 1290.77, 1438.36, 1329.45, 1370.51, null, 1259.37],
  102: [1105.36, 2930.27, 1108.99, null, 1303.95, 1451.96, 1342.61, 1384.01, null, 1271.84],
  103: [1116.07, 2963.26, 1118.99, null, 1317.13, 1465.55, 1355.77, 1397.65, null, 1284.31],
  104: [1126.77, 2996.25, 1128.99, null, 1330.31, 1479.14, 1368.94, 1411.26, null, 1296.78],
  105: [1137.48, 3029.24, 1138.99, null, 1343.50, 1492.73, 1382.10, 1424.78, null, 1309.25],
  106: [1148.18, 3062.23, 1148.99, null, 1356.68, 1506.32, 1395.26, 1438.39, null, 1321.72],
  107: [1158.89, 3095.22, 1158.99, null, 1369.86, 1519.91, 1408.43, 1451.91, null, 1334.19],
  108: [1169.59, 3128.21, 1168.99, null, 1383.05, 1533.50, 1421.59, 1465.53, null, 1346.66],
  109: [1180.30, 3161.20, 1178.99, null, 1396.23, 1547.09, 1434.75, 1479.05, null, 1359.12],
  110: [1191.01, 3194.19, 1188.99, null, 1409.41, 1560.68, 1447.92, 1492.66, null, 1371.59],
  111: [1201.71, 3227.18, 1198.99, null, 1422.59, 1574.28, 1461.08, 1506.18, null, 1384.06],
  112: [1212.42, 3260.17, 1208.99, null, 1435.78, 1587.87, 1474.24, 1519.79, null, 1396.53],
  113: [1223.12, 3293.16, 1218.99, null, 1448.96, 1601.46, 1487.40, 1533.32, null, 1409.00],
  114: [1233.83, 3326.15, 1228.99, null, 1462.14, 1615.05, 1500.57, 1546.90, null, 1421.47],
  115: [1244.54, 3359.14, 1238.99, null, 1475.32, 1628.64, 1513.73, 1560.45, null, 1433.94],
  116: [1255.24, 3392.13, 1248.99, null, 1488.51, 1642.23, 1526.89, 1574.04, null, 1446.41],
  117: [1265.95, 3425.12, 1258.99, null, 1501.69, 1655.82, 1540.06, 1587.58, null, 1458.88],
  118: [1276.65, 3458.11, 1268.99, null, 1514.87, 1669.41, 1553.22, 1601.17, null, 1471.35],
  119: [1287.36, 3491.10, 1278.99, null, 1528.05, 1683.00, 1566.38, 1614.78, null, 1483.82],
  120: [1298.06, 3524.09, 1288.99, null, 1541.24, 1696.59, 1579.54, 1628.31, null, 1496.28],
  130: [1405.12, 3853.99, 1388.99, null, 1673.06, 1832.51, 1711.17, 1763.97, null, 1620.97],
  140: [1512.18, 4183.89, 1488.99, null, 1804.89, 1968.42, 1842.80, 1899.71, null, 1745.66],
  150: [1619.24, 4513.79, 1588.99, null, 1936.72, 2104.33, 1974.43, 2035.38, null, 1870.36],
  200: [2154.53, 6163.29, 2088.99, null, 2595.85, 2783.88, 2632.66, 2715.83, null, 2493.81],
  250: [2689.82, 7812.79, 2588.99, null, 3254.99, 3463.43, 3290.89, 3396.29, null, 3117.26],
  300: [3225.11, 9462.29, 3088.99, null, 3914.12, 4142.98, 3949.12, 4076.74, null, 3740.71],
  350: [3760.40, 11111.79, 3588.99, null, 4573.25, 4822.54, 4607.35, 4757.20, null, 4364.16],
  400: [4295.69, 12761.29, 4088.99, null, 5232.39, 5502.09, 5265.58, 5437.66, null, 4987.61],
  450: [4830.98, 14410.79, 4588.99, null, 5891.52, 6181.64, 5923.81, 6118.11, null, 5611.07],
  500: [5366.27, 16060.29, 5088.99, null, 6550.66, 6861.20, 6582.04, 6798.57, null, 6234.52],
};

const CARGO_COMPANIES = [
  { key: "aras", label: "Aras", idx: 0 },
  { key: "dhl", label: "DHL eCommerce", idx: 1 },
  { key: "kolaygelsin", label: "Kolay Gelsin", idx: 2 },
  { key: "ptt", label: "PTT", idx: 3 },
  { key: "surat", label: "Sürat", idx: 4 },
  { key: "tex", label: "TEX", idx: 5 },
  { key: "yurtici", label: "Yurtiçi", idx: 6 },
  { key: "ceva_tedarik", label: "CEVA Tedarik", idx: 7 },
  { key: "ceva", label: "CEVA", idx: 8 },
  { key: "horoz", label: "Horoz", idx: 9 },
];

// Desi değerine göre en yakın aralığı bul
function getPriceForDesi(desi: number, companyIdx: number): number | null {
  // Tam eşleşme
  if (CARGO_PRICES[desi] !== undefined) {
    return CARGO_PRICES[desi][companyIdx] ?? null;
  }
  // 101-500 arası boşluklar için interpolasyon
  const keys = Object.keys(CARGO_PRICES).map(Number).sort((a, b) => a - b);
  let lower = 0, upper = 0;
  for (let i = 0; i < keys.length - 1; i++) {
    if (keys[i] <= desi && desi < keys[i + 1]) {
      lower = keys[i];
      upper = keys[i + 1];
      break;
    }
  }
  if (lower === 0 && upper === 0) return null;

  const pLow = CARGO_PRICES[lower]?.[companyIdx];
  const pHigh = CARGO_PRICES[upper]?.[companyIdx];
  if (pLow == null || pHigh == null) return null;

  // Lineer interpolasyon
  const ratio = (desi - lower) / (upper - lower);
  return pLow + ratio * (pHigh - pLow);
}

export function CargoPriceCalculator() {
  const [width, setWidth] = useState("");
  const [height, setHeight] = useState("");
  const [depth, setDepth] = useState("");
  const [weightKg, setWeightKg] = useState("");
  // Kargo fiyatları her zaman KDV dahil gösterilir (%20 KDV)
  const includeVat = true;

  const desi = useMemo(() => {
    const w = parseFloat(width);
    const h = parseFloat(height);
    const d = parseFloat(depth);
    if (!w || !h || !d) return null;
    return Math.ceil((w * h * d) / 3000);
  }, [width, height, depth]);

  const effectiveDesi = useMemo(() => {
    const kg = parseFloat(weightKg);
    if (!desi) return null;
    const weightAsDesi = !isNaN(kg) && kg > 0 ? Math.ceil(kg) : 0;
    return Math.max(desi, weightAsDesi);
  }, [desi, weightKg]);

  const prices = useMemo(() => {
    if (!effectiveDesi) return null;
    const vatMultiplier = includeVat ? 1.20 : 1.0;
    return CARGO_COMPANIES.map((company) => {
      const basePrice = getPriceForDesi(effectiveDesi, company.idx);
      if (basePrice === null) return { ...company, price: null };
      return { ...company, price: basePrice * vatMultiplier };
    });
  }, [effectiveDesi, includeVat]);

  const cheapest = useMemo(() => {
    if (!prices) return null;
    const valid = prices.filter((p) => p.price !== null);
    if (!valid.length) return null;
    return valid.reduce((a, b) => ((a.price ?? Infinity) < (b.price ?? Infinity) ? a : b));
  }, [prices]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Truck className="w-5 h-5" />
            Kargo Fiyatı Hesaplayıcı
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            22 Mayıs 2026 geçerli Trendyol anlaşmalı kargo fiyatları (KDV dahil)
          </p>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Boyut + Ağırlık Girişi */}
          <div>
            <p className="text-sm font-semibold mb-3 flex items-center gap-2">
              <Package className="w-4 h-4" />
              Paket Ölçüleri
            </p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div>
                <Label htmlFor="cargo-width">En (cm)</Label>
                <Input id="cargo-width" type="number" min="1" placeholder="30" value={width}
                  onChange={(e) => setWidth(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="cargo-height">Boy (cm)</Label>
                <Input id="cargo-height" type="number" min="1" placeholder="20" value={height}
                  onChange={(e) => setHeight(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="cargo-depth">Yükseklik (cm)</Label>
                <Input id="cargo-depth" type="number" min="1" placeholder="15" value={depth}
                  onChange={(e) => setDepth(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="cargo-weight">Ağırlık (kg)</Label>
                <Input id="cargo-weight" type="number" min="0" step="0.1" placeholder="1.5" value={weightKg}
                  onChange={(e) => setWeightKg(e.target.value)} />
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Desi = (En × Boy × Yükseklik) ÷ 3000 — kargo, desi ile ağırlıktan büyük olanı alır.
            </p>
          </div>

          {/* KDV Bilgisi */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded px-2 py-1 text-amber-800 dark:text-amber-200 text-xs font-medium">
              Fiyatlar KDV dahil (%20) gösterilmektedir
            </span>
          </div>

          {/* Desi Bilgisi */}
          {effectiveDesi !== null && (
            <div className="flex flex-wrap items-center gap-3 p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-2">
                <Calculator className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm">Hesaplanan Desi:</span>
                <Badge variant="secondary" className="text-base font-bold px-3">{desi}</Badge>
              </div>
              {parseFloat(weightKg) > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Ağırlık Desisi:</span>
                  <Badge variant="outline">{Math.ceil(parseFloat(weightKg))}</Badge>
                </div>
              )}
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold">Faturalandırılan Desi:</span>
                <Badge className="text-base font-bold px-3 bg-orange-500 hover:bg-orange-600">{effectiveDesi}</Badge>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Fiyat Tablosu */}
      {prices && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Truck className="w-4 h-4" />
              Kargo Firması Fiyatları
              <span className="text-sm font-normal text-muted-foreground ml-1">
                ({effectiveDesi} desi, KDV dahil %20)
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {prices.map((company) => {
                const isCheapest = cheapest?.key === company.key;
                const isUnavailable = company.price === null;
                return (
                  <div key={company.key}
                    className={`flex items-center justify-between rounded-lg px-4 py-3 border transition-colors
                      ${isCheapest ? "border-green-400 bg-green-50 dark:bg-green-950/30" : "border-border bg-card"}
                      ${isUnavailable ? "opacity-50" : ""}`}
                  >
                    <div className="flex items-center gap-2">
                      {isCheapest && <span className="text-green-600 text-sm">✓</span>}
                      <span className={`text-sm font-medium ${isCheapest ? "text-green-800 dark:text-green-200" : ""}`}>
                        {company.label}
                      </span>
                      {isCheapest && (
                        <Badge className="text-xs bg-green-500 hover:bg-green-600 text-white ml-1">En Ucuz</Badge>
                      )}
                    </div>
                    <span className={`font-bold text-base ${isCheapest ? "text-green-700 dark:text-green-300" : "text-foreground"}`}>
                      {isUnavailable ? "—" : `₺${company.price!.toFixed(2)}`}
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg text-xs text-amber-800 dark:text-amber-200 space-y-1">
              <p className="font-semibold">Notlar:</p>
              <p>• Fiyatlar Trendyol anlaşmalı kargo fiyatlarıdır ve tarafınıza faturalandırılır.</p>
              <p>• PTT yalnızca 0–100 desi aralığında hizmet vermektedir (tabloda mevcut).</p>
              <p>• CEVA Tedarik ve CEVA arası 30+ desi için önceden kargo şubesiyle mutabık kalınmalıdır.</p>
              <p>• 100 desi ve üzeri gönderilerde lojistik firmalar hariç ağır kargo ek bedeli uygulanır.</p>
              <p>• Başarısız teslimat ve iade bedelleri ayrıca faturalandırılır.</p>
              <p>• Barem altı uygulamalarında bu fiyatlar değil, barem altı fiyatları geçerlidir.</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
