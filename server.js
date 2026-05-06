import { createApp } from "./src/server/app.js";
import { config } from "./src/server/config.js";

const app = createApp();

app.listen(config.port, () => {
  console.log(`TF20 app listening on port ${config.port}`);
});
