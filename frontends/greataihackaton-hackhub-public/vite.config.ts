import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    proxy: {
      "/api": {
        target:
          "https://e6ji56irkc.execute-api.ap-southeast-1.amazonaws.com/Prod", // YOUR API GATEWAY INVOKE URL
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ""),
        configure: (proxy, options) => {
          proxy.on("proxyReq", (proxyReq, req, res) => {
            console.log("Proxying request:", req.method, req.url);

            proxyReq.removeHeader("x-amz-security-token");
            proxyReq.removeHeader("x-api-key"); // If you had an API key configured on API Gateway that expects this.
            console.log(
              "Vite Proxy: Removing auth headers for",
              req.method,
              "request."
            );

            const outgoingAuthHeader = proxyReq.getHeader("Authorization");
            console.log(
              "Vite Proxy: Outgoing Authorization header (to API Gateway):",
              outgoingAuthHeader
            );

            if (req.method === "OPTIONS") {
              proxyReq.removeHeader("Authorization"); // Remove Authorization for OPTIONS preflight
              console.log(
                "Vite Proxy: Intercepted OPTIONS request, removing Authorization header."
              );
      plugins: [react(), mode === "development" && false].filter(Boolean),
              console.log(
                "Vite Proxy: Passing Authorization header for",
                req.method,
                "request."
              );
            }
          });

          proxy.on("proxyRes", (proxyRes, req, res) => {
            console.log(
              "Received proxy response for:",
              req.method,
              req.url,
              "Status:",
              proxyRes.statusCode
            );
            if (
              req.method === "OPTIONS" &&
              (proxyRes.statusCode === 403 ||
                proxyRes.statusCode === 400 ||
                proxyRes.statusCode === 500)
            ) {
              console.warn(
                "Vite Proxy: Overriding OPTIONS response status and headers due to upstream error."
              );
              proxyRes.statusCode = 200; // Force 200 OK for preflight
              proxyRes.headers["Access-Control-Allow-Origin"] =
                "https://hackhub.greataihackathon.com";
              proxyRes.headers["Access-Control-Allow-Methods"] =
                "OPTIONS,GET,HEAD,POST,PUT,DELETE,PATCH";
              proxyRes.headers["Access-Control-Allow-Headers"] =
                "Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token,X-Amz-User-Agent,X-Requested-With,Accept,Origin,Access-Control-Request-Method,Access-Control-Request-Headers";
              proxyRes.headers["Access-Control-Max-Age"] = "3600";
              proxyRes.headers["Content-Type"] = "application/json";
            }
          });
        },
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
