const { exec } = require("child_process");
const fs = require("fs");
const readline = require("readline");

// Function to run shell commands
function runCommand(command, cwd) {
  return new Promise((resolve, reject) => {
    exec(command, { cwd }, (error, stdout, stderr) => {
      if (error) {
        reject(stderr);
      } else {
        resolve(stdout);
      }
    });
  });
}

// Function to prompt user for input
function askQuestion(query) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) =>
    rl.question(query, (ans) => {
      rl.close();
      resolve(ans);
    }),
  );
}

async function setupProject() {
  try {
    console.log("Installing Node.js dependencies...");
    await runCommand("npm install", "./");

    console.log("Installing Python dependencies...");
    await runCommand("pip install -r requirements.txt", "./flask-backend");

    const googleApiKey = await askQuestion("Enter your Google API Key: ");

    const envFilePath = "./flask-backend/.env";
    const envContent = `GOOGLE_API_KEY=${googleApiKey}\n`;

    fs.writeFileSync(envFilePath, envContent, { flag: "a" });
    console.log("Google API Key has been saved to flask-backend/.env");

    console.log("Setup completed successfully!");
  } catch (error) {
    console.error("Setup failed:", error);
  }
}

setupProject();
