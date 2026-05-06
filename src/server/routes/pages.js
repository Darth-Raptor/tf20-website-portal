import path from "node:path";
import express from "express";
import passport from "passport";

import { requireAuth } from "../middleware/auth.js";

export function pageRouter(projectRoot) {
  const router = express.Router();

  router.get("/", (req, res) => {
    res.sendFile(path.join(projectRoot, "index.html"));
  });

  router.get("/login", (req, res) => {
    if (!passport._strategy("discord")) {
      res.status(503).send("Discord OAuth is not configured yet.");
      return;
    }
    passport.authenticate("discord")(req, res);
  });

  router.get(
    "/auth/discord/callback",
    passport.authenticate("discord", {
      failureRedirect: "/login",
    }),
    (req, res) => {
      res.redirect("/portal");
    },
  );

  router.post("/logout", (req, res, next) => {
    req.logout((error) => {
      if (error) {
        next(error);
        return;
      }
      res.redirect("/");
    });
  });

  router.get("/portal", requireAuth, (req, res) => {
    res.sendFile(path.join(projectRoot, "portal.html"));
  });

  router.get("/portal.html", requireAuth, (req, res) => {
    res.redirect("/portal");
  });

  return router;
}
