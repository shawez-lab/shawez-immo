import { onRequest as __api_espace___route___js_onRequest } from "/home/claude/shawez-immo/functions/api/espace/[[route]].js"

export const routes = [
    {
      routePath: "/api/espace/:route*",
      mountPath: "/api/espace",
      method: "",
      middlewares: [],
      modules: [__api_espace___route___js_onRequest],
    },
  ]