import { loadDB, prisma } from "./src/server/database";
import bcrypt from "bcryptjs";

async function fix() {
  await loadDB();
  const user = await prisma.user.findUnique({ where: { email: "viniciusc.castro09@gmail.com" } });
  if (user) {
    const hashed = await bcrypt.hash("091422", 10);
    await prisma.user.update({
      where: { email: "viniciusc.castro09@gmail.com" },
      data: { password: hashed }
    });
    console.log("Password fixed!");
  } else {
    console.log("User not found!");
  }
}
fix();
