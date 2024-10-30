import fs from "fs";
import path from "path";

// Utility function to log payload to a file
export const logWebhookPayload = (
  event: string,
  payload: Record<string, any>,
): void => {
  const logDirectory = path.resolve("webhook_logs");

  // Create the directory if it doesn't exist
  if (!fs.existsSync(logDirectory)) {
    fs.mkdirSync(logDirectory);
  }

  // Define the file name based on event and timestamp
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const logFilePath = path.join(logDirectory, `${event}-${timestamp}.json`);

  // Write the payload to the log file
  fs.writeFileSync(logFilePath, JSON.stringify(payload, null, 2));
  console.log(`Payload logged for event ${event} at ${logFilePath}`);
};
