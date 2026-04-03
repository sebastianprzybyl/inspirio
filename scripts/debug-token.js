import { config } from "dotenv";
config();

const token = process.env.INSTAGRAM_ACCESS_TOKEN;
console.log("Dlugosc tokenu:", token?.length);
console.log("Prefix       :", token?.slice(0, 10));
console.log("Suffix       :", token?.slice(-10));

const res = await fetch(
  `https://graph.instagram.com/v21.0/me?fields=id,name,username`,
  { headers: { Authorization: `Bearer ${token}` } },
);
const json = await res.json();
console.log("\nPelna odpowiedz Meta:");
console.log(JSON.stringify(json, null, 2));

