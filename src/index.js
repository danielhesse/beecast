import server from "./server.js";
import { logger } from "./utils.js";

server.listen(3333).on("listening", () => {
  logger.info("🚀 Server running on port 3333!");
});
