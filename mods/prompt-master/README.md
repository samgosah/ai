# Prompt Master

Rewrites your rough prompt into a clear, well-structured one before it's sent. It keeps your intent, names, paths and constraints.

- **✨ Prompt Master button** (above the prompt box, terminal and desktop): rewrites your draft in place so you can review it. **Undo** restores the original.
- **`pm: <rough prompt>`**: type this prefix and send; the rewrite goes out instead. Works everywhere, including mobile and web.
- **`/pm <rough prompt>`**: puts the rewrite in the box for review, or sends it where the app owns the box.

## Install

At the prompt of a terminal session:

```
/plugin install prompt-master --marketplace samgosah/ai
```

From a shell:

```
claude plugin install prompt-master --marketplace samgosah/ai
```

Answer `y` to add the marketplace, then pick a scope (user scope loads it in every session).

In the desktop app, where `/plugin` does not run: click + next to the prompt box, then Plugins, Add marketplace with `samgosah/ai`, then Add plugin.

If the repository is private, the install only works for people who can read it on GitHub and already have a git credential for github.com (an SSH key, or `gh auth login` then `gh auth setup-git`).
