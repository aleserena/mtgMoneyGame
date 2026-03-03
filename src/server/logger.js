function baseLog(level, message, meta) {
  const payload = {
    level,
    time: new Date().toISOString(),
    message,
    ...(meta || {}),
  };
  // Structured JSON logs for easier filtering in production.
  // eslint-disable-next-line no-console
  console.log(JSON.stringify(payload));
}

function info(message, meta) {
  baseLog("info", message, meta);
}

function warn(message, meta) {
  baseLog("warn", message, meta);
}

function error(message, meta) {
  baseLog("error", message, meta);
}

module.exports = {
  info,
  warn,
  error,
};

