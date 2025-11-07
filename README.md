# Auditoria Interna de 5S

Site/diagnóstico 5S com páginas HTML, CSS e JS.

## Estrutura do projeto
- `public/` (pasta publicada)
  - `index.html`, `diagnostico.html`, `resultado.html`
  - `css/style.css`, `js/diagnostico.js`, `js/resultado.js`
  - `assets/`, `img/`
- `.gitignore` ignora backups, zips e temporários.

## Como publicar alterações
Após editar arquivos:
```
git add .
git commit -m "sua mensagem"
git push
```

Windows (recomendado uma vez por repositório):
```
git config core.autocrlf true
```

## Deploy
- Netlify: configure `Publish directory` = `public` (arquivo `_headers` já está em `public/`).
- GitHub Pages: use Actions/Pages ou mude a pasta para `docs/` caso queira servir direto do GitHub Pages sem build.
