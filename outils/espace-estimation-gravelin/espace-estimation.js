/* Espace estimation — module autonome (fabriqué par outils/espace.py : ne pas modifier ici).
   Dans la page : <div data-espace-estimation="estimer"></div> (ou "mon-espace", "admin"), puis ce script.
   Réglages facultatifs avant ce script : window.EE_CONF = { site, conseiller, tel, telAffiche, email, portrait,
   confidentialite, estimer, espace, admin, api }. */
(function(){
'use strict';
var defauts={site:'gravelin',confidentialite:'/politique-de-confidentialite'};
var regles=window.EE_CONF||{}; Object.keys(regles).forEach(function(k){defauts[k]=regles[k];}); window.EE_CONF=defauts;
/* Pictogramme « Mon espace » : état connecté d'après le témoin se_ok (posé par l'API à la connexion, retiré à la déconnexion) */
window.EECompte=function(){var on=/(?:^|;\s*)se_ok=1/.test(document.cookie||'');[].forEach.call(document.querySelectorAll('[data-compte]'),function(a){a.classList.toggle('is-in',on);var t=on?'Mon espace : connecté':'Mon espace : se connecter';if(a.hasAttribute('aria-label')){a.setAttribute('aria-label',t);a.title=t;}var x=a.querySelector('[data-compte-txt]');if(x)x.textContent=on?'Mon espace · connecté':'Mon espace';});};
window.EECompte();window.addEventListener('pageshow',window.EECompte);

var FRAGMENTS={"estimer":"<section class=\"route ee\" data-route=\"/estimer\" id=\"r-estimer\">\n  <div class=\"page-head shell\">\n    <p class=\"label\">Estimation en ligne<\/p>\n    <h1 class=\"display d-xl\" style=\"margin-top:14px;\">Combien vaut votre bien <em>aujourd'hui ?<\/em><\/h1>\n    <p class=\"lede\">Six questions, deux minutes. Une fourchette calculée sur les ventes réelles autour de chez vous, puis l'avis de Shawez, sur place.<\/p>\n  <\/div>\n  <div class=\"shell\">\n    <form class=\"form ee-wrap\" id=\"ee-form\" novalidate autocomplete=\"on\">\n      <div class=\"hp\" aria-hidden=\"true\"><label for=\"ee-hp\">Ne rien écrire ici<\/label><input type=\"text\" id=\"ee-hp\" name=\"ee_hp_k7\" tabindex=\"-1\" autocomplete=\"off\" data-lpignore=\"true\" data-1p-ignore data-form-type=\"other\"><\/div>\n      <ol class=\"ee-steps\" id=\"ee-steps\" aria-label=\"Étapes de l'estimation\">\n        <li><span><b>1<\/b>Adresse<\/span><\/li><li><span><b>2<\/b>Type<\/span><\/li><li><span><b>3<\/b>Le bien<\/span><\/li><li><span><b>4<\/b>Atouts<\/span><\/li><li><span><b>5<\/b>Prix<\/span><\/li><li><span><b>6<\/b>Projet<\/span><\/li>\n      <\/ol>\n\n      <!-- 1 ADRESSE -->\n      <div class=\"ee-step\" data-s=\"adresse\" tabindex=\"-1\">\n        <div class=\"ee-head\"><p class=\"ee-count\">Étape 1 sur 6<\/p><h2 class=\"ee-q\">Où se trouve <em>votre bien ?<\/em><\/h2><p class=\"ee-sub\">Le numéro et la rue suffisent : on compare avec les ventes de la rue et du quartier.<\/p><\/div>\n        <div class=\"field ee-addr\">\n          <label for=\"ee-adresse\">Adresse du bien<\/label>\n          <div style=\"position:relative;\">\n            <svg class=\"pin\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.8\" aria-hidden=\"true\"><path d=\"M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21Z\"/><circle cx=\"12\" cy=\"9.5\" r=\"2.5\"/><\/svg>\n            <input type=\"text\" id=\"ee-adresse\" name=\"adresse\" placeholder=\"ex. 30 rue Bannelier, Dijon\" autocomplete=\"street-address\" role=\"combobox\" aria-autocomplete=\"list\" aria-expanded=\"false\" aria-controls=\"ee-sugg\" aria-describedby=\"ee-adresse-msg\" spellcheck=\"false\" enterkeyhint=\"search\">\n          <\/div>\n          <ul class=\"ee-sugg\" id=\"ee-sugg\" role=\"listbox\" aria-label=\"Adresses proposées\" hidden><\/ul>\n          <span class=\"msg\" id=\"ee-adresse-msg\">Choisissez l'adresse dans la liste.<\/span>\n        <\/div>\n        <p class=\"ee-picked\" id=\"ee-picked\" hidden><svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" aria-hidden=\"true\"><path d=\"M5 12.5l4.5 4.5L19 7.5\"/><\/svg><span><\/span><\/p>\n        <div class=\"ee-nav\"><span><\/span><button type=\"button\" class=\"btn btn-primary btn-lg\" data-next>Étape suivante <span class=\"arw\">→<\/span><\/button><\/div>\n      <\/div>\n\n      <!-- 2 TYPE -->\n      <div class=\"ee-step\" data-s=\"type\" tabindex=\"-1\" hidden>\n        <div class=\"ee-head\"><p class=\"ee-count\">Étape 2 sur 6<\/p><h2 class=\"ee-q\">C'est <em>plutôt…<\/em><\/h2><\/div>\n        <div class=\"ee-tiles\" role=\"group\" aria-label=\"Type de bien\">\n          <button type=\"button\" class=\"ee-tile\" data-type=\"appartement\" aria-pressed=\"false\"><svg viewBox=\"0 0 48 48\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.6\" aria-hidden=\"true\"><path d=\"M10 42V8h22v34M32 18h8v24M6 42h38\"/><path d=\"M15 14h3M24 14h3M15 21h3M24 21h3M15 28h3M24 28h3M19 42v-7h6v7\"/><\/svg>Un appartement<\/button>\n          <button type=\"button\" class=\"ee-tile\" data-type=\"maison\" aria-pressed=\"false\"><svg viewBox=\"0 0 48 48\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.6\" aria-hidden=\"true\"><path d=\"M6 22 24 8l18 14M11 18v24h26V18M6 42h36\"/><path d=\"M20 42V31h8v11M15 25h4M29 25h4\"/><\/svg>Une maison<\/button>\n        <\/div>\n        <p class=\"ee-more\">Un commerce, des murs, un immeuble, un terrain ? <button type=\"button\" id=\"ee-autre-btn\" aria-expanded=\"false\">C'est par ici<\/button><\/p>\n        <div class=\"field\" id=\"ee-autre\" hidden>\n          <span class=\"lab\">Votre bien<\/span>\n          <div class=\"pills\" role=\"group\" aria-label=\"Autre type de bien\">\n            <button type=\"button\" class=\"pill\" data-autre=\"commerce\">Fonds de commerce<\/button><button type=\"button\" class=\"pill\" data-autre=\"murs\">Murs commerciaux<\/button><button type=\"button\" class=\"pill\" data-autre=\"immeuble\">Immeuble<\/button><button type=\"button\" class=\"pill\" data-autre=\"terrain\">Terrain<\/button><button type=\"button\" class=\"pill\" data-autre=\"autre\">Autre<\/button>\n          <\/div>\n          <p class=\"note\">Pas de fourchette automatique pour ces biens : Shawez les étudie lui-même et vous rappelle sous 24 h.<\/p>\n        <\/div>\n        <span class=\"msg\" id=\"ee-type-msg\" hidden>Choisissez un type de bien.<\/span>\n        <div class=\"ee-nav\"><button type=\"button\" class=\"btn\" data-prev>Retour<\/button><button type=\"button\" class=\"btn btn-primary btn-lg\" data-next>Étape suivante <span class=\"arw\">→<\/span><\/button><\/div>\n      <\/div>\n\n      <!-- 3 LE BIEN -->\n      <div class=\"ee-step\" data-s=\"bien\" tabindex=\"-1\" hidden>\n        <div class=\"ee-head\"><p class=\"ee-count\">Étape 3 sur 6<\/p><h2 class=\"ee-q\">Parlons <em>du bien.<\/em><\/h2><\/div>\n        <div class=\"field\">\n          <label for=\"ee-surface\" id=\"ee-surface-lab\">Surface habitable<\/label>\n          <div class=\"ee-unit\"><input type=\"number\" id=\"ee-surface\" inputmode=\"numeric\" min=\"9\" max=\"2000\" placeholder=\"ex. 72\"><i>m²<\/i><\/div>\n          <span class=\"hint\" id=\"ee-surface-hint\">Surface loi Carrez si vous l'avez, sinon une surface approximative.<\/span>\n          <span class=\"msg\">Indiquez la surface (en m²).<\/span>\n        <\/div>\n        <div class=\"ee-stps\" data-pour=\"appartement maison\">\n          <div class=\"ee-stp\" data-k=\"etage\" data-min=\"0\" data-max=\"40\" data-v=\"1\" data-pour=\"appartement\"><div class=\"l\">Étage du bien<small>0 = rez-de-chaussée<\/small><\/div><div class=\"c\"><button type=\"button\" data-d=\"-1\" aria-label=\"Moins\">−<\/button><output aria-live=\"polite\">1<\/output><button type=\"button\" data-d=\"1\" aria-label=\"Plus\">+<\/button><\/div><\/div>\n          <div class=\"ee-stp\" data-k=\"etages_immeuble\" data-min=\"0\" data-max=\"40\" data-v=\"4\" data-pour=\"appartement\"><div class=\"l\">Étages de l'immeuble<small>Sans compter le rez-de-chaussée<\/small><\/div><div class=\"c\"><button type=\"button\" data-d=\"-1\" aria-label=\"Moins\">−<\/button><output aria-live=\"polite\">4<\/output><button type=\"button\" data-d=\"1\" aria-label=\"Plus\">+<\/button><\/div><\/div>\n          <div class=\"ee-stp\" data-k=\"niveaux\" data-min=\"1\" data-max=\"6\" data-v=\"2\" data-pour=\"maison\"><div class=\"l\">Niveaux habitables<small>1 = plain-pied<\/small><\/div><div class=\"c\"><button type=\"button\" data-d=\"-1\" aria-label=\"Moins\">−<\/button><output aria-live=\"polite\">2<\/output><button type=\"button\" data-d=\"1\" aria-label=\"Plus\">+<\/button><\/div><\/div>\n          <div class=\"ee-stp\" data-k=\"pieces\" data-min=\"1\" data-max=\"20\" data-v=\"3\"><div class=\"l\">Pièces<small>Sans la cuisine ni les salles d'eau<\/small><\/div><div class=\"c\"><button type=\"button\" data-d=\"-1\" aria-label=\"Moins\">−<\/button><output aria-live=\"polite\">3<\/output><button type=\"button\" data-d=\"1\" aria-label=\"Plus\">+<\/button><\/div><\/div>\n          <div class=\"ee-stp\" data-k=\"chambres\" data-min=\"0\" data-max=\"15\" data-v=\"2\"><div class=\"l\">Chambres<\/div><div class=\"c\"><button type=\"button\" data-d=\"-1\" aria-label=\"Moins\">−<\/button><output aria-live=\"polite\">2<\/output><button type=\"button\" data-d=\"1\" aria-label=\"Plus\">+<\/button><\/div><\/div>\n        <\/div>\n        <div class=\"field\" data-pour=\"maison\">\n          <label for=\"ee-terrain\">Surface du terrain<\/label>\n          <div class=\"ee-unit\"><input type=\"number\" id=\"ee-terrain\" inputmode=\"numeric\" min=\"0\" max=\"1000000\" placeholder=\"ex. 600\"><i>m²<\/i><\/div>\n          <span class=\"hint\">0 s'il n'y a pas de terrain.<\/span>\n          <span class=\"msg\">Indiquez la surface du terrain (0 s'il n'y en a pas).<\/span>\n        <\/div>\n        <div class=\"field\" data-pour=\"appartement maison\">\n          <span class=\"lab\">Époque de construction<\/span>\n          <div class=\"ee-grid2\" data-choix=\"epoque\" role=\"group\" aria-label=\"Époque de construction\">\n            <button type=\"button\" class=\"ee-opt\" data-v=\"avant1948\">Avant 1948<\/button><button type=\"button\" class=\"ee-opt\" data-v=\"1948-1974\">1948 – 1974<\/button><button type=\"button\" class=\"ee-opt\" data-v=\"1975-2000\">1975 – 2000<\/button><button type=\"button\" class=\"ee-opt\" data-v=\"2001-2012\">2001 – 2012<\/button><button type=\"button\" class=\"ee-opt\" data-v=\"apres2012\">Après 2012<\/button><button type=\"button\" class=\"ee-opt\" data-v=\"nsp\">Je ne sais pas<\/button>\n          <\/div>\n          <span class=\"msg\">Choisissez une époque (ou « Je ne sais pas »).<\/span>\n        <\/div>\n        <div class=\"field\" data-pour=\"appartement maison\">\n          <span class=\"lab\">État général<\/span>\n          <div class=\"ee-list\" data-choix=\"etat\" role=\"group\" aria-label=\"État général\">\n            <button type=\"button\" class=\"ee-opt\" data-v=\"travaux\"><span>Travaux importants<small>Électricité, plomberie, toiture ou rénovation complète<\/small><\/span><\/button>\n            <button type=\"button\" class=\"ee-opt\" data-v=\"rafraichir\"><span>Quelques travaux<small>Peintures, sols, cuisine à reprendre<\/small><\/span><\/button>\n            <button type=\"button\" class=\"ee-opt\" data-v=\"bon\"><span>Bon état<small>On peut y habiter tel quel<\/small><\/span><\/button>\n            <button type=\"button\" class=\"ee-opt\" data-v=\"neuf\"><span>Refait à neuf<small>Rénové il y a moins de 5 ans, ou neuf<\/small><\/span><\/button>\n          <\/div>\n          <span class=\"msg\">Choisissez l'état général.<\/span>\n        <\/div>\n        <div class=\"field\" data-pour=\"autre\">\n          <label for=\"ee-message\">En quelques mots<\/label>\n          <textarea id=\"ee-message\" maxlength=\"1500\" placeholder=\"Activité, chiffre d'affaires, loyer, nombre de lots… ce qui vous semble utile.\"><\/textarea>\n        <\/div>\n        <div class=\"ee-nav\"><button type=\"button\" class=\"btn\" data-prev>Retour<\/button><button type=\"button\" class=\"btn btn-primary btn-lg\" data-next>Étape suivante <span class=\"arw\">→<\/span><\/button><\/div>\n      <\/div>\n\n      <!-- 4 ATOUTS -->\n      <div class=\"ee-step\" data-s=\"atouts\" tabindex=\"-1\" hidden>\n        <div class=\"ee-head\"><p class=\"ee-count\">Étape 4 sur 6<\/p><h2 class=\"ee-q\">Ce qui fait <em>la différence.<\/em><\/h2><p class=\"ee-sub\">Cochez tout ce qui s'applique.<\/p><\/div>\n        <div class=\"ee-checks\">\n          <label class=\"ee-check\" data-pour=\"appartement\"><input type=\"checkbox\" name=\"ascenseur\"><i><\/i>Ascenseur<\/label>\n          <label class=\"ee-check\" data-pour=\"appartement\"><input type=\"checkbox\" name=\"balcon\"><i><\/i>Balcon<\/label>\n          <label class=\"ee-check\"><input type=\"checkbox\" name=\"terrasse\"><i><\/i>Terrasse<\/label>\n          <label class=\"ee-check\" data-pour=\"appartement\"><input type=\"checkbox\" name=\"cave\"><i><\/i>Cave<\/label>\n          <label class=\"ee-check\" data-pour=\"appartement\"><input type=\"checkbox\" name=\"gardien\"><i><\/i>Gardien<\/label>\n          <label class=\"ee-check\" data-pour=\"appartement\"><input type=\"checkbox\" name=\"parking\"><i><\/i>Place de parking<\/label>\n          <label class=\"ee-check\" data-pour=\"appartement\"><input type=\"checkbox\" name=\"parking_box\"><i><\/i>Garage ou box<\/label>\n          <label class=\"ee-check\" data-pour=\"maison\"><input type=\"checkbox\" name=\"plain_pied\"><i><\/i>Plain-pied<\/label>\n          <label class=\"ee-check\" data-pour=\"maison\"><input type=\"checkbox\" name=\"piscine\"><i><\/i>Piscine<\/label>\n          <label class=\"ee-check\" data-pour=\"maison\"><input type=\"checkbox\" name=\"garage\"><i><\/i>Garage<\/label>\n        <\/div>\n        <div class=\"ee-nav\"><button type=\"button\" class=\"btn\" data-prev>Retour<\/button><button type=\"button\" class=\"btn btn-primary btn-lg\" data-next>Étape suivante <span class=\"arw\">→<\/span><\/button><\/div>\n      <\/div>\n\n      <!-- 5 PRIX -->\n      <div class=\"ee-step\" data-s=\"prix\" tabindex=\"-1\" hidden>\n        <div class=\"ee-head\"><p class=\"ee-count\">Étape 5 sur 6<\/p><h2 class=\"ee-q\">Et vous, vous l'imaginez <em>à combien ?<\/em><\/h2><p class=\"ee-sub\">Facultatif. Ça aide Shawez à comprendre votre projet ; ça ne change pas le calcul.<\/p><\/div>\n        <div class=\"field\">\n          <label for=\"ee-prix\">Prix de vente idéal<\/label>\n          <div class=\"ee-unit\"><input type=\"text\" id=\"ee-prix\" inputmode=\"numeric\" placeholder=\"ex. 250 000\" autocomplete=\"off\"><i>€<\/i><\/div>\n          <span class=\"msg\">Indiquez un montant en euros, ou laissez vide.<\/span>\n        <\/div>\n        <div class=\"ee-nav\"><button type=\"button\" class=\"btn\" data-prev>Retour<\/button><button type=\"button\" class=\"btn btn-primary btn-lg\" data-next>Étape suivante <span class=\"arw\">→<\/span><\/button><\/div>\n      <\/div>\n\n      <!-- 6 PROJET -->\n      <div class=\"ee-step\" data-s=\"projet\" tabindex=\"-1\" hidden>\n        <div class=\"ee-head\"><p class=\"ee-count\">Étape 6 sur 6<\/p><h2 class=\"ee-q\">Vous pensez vendre <em>quand ?<\/em><\/h2><\/div>\n        <div class=\"field\">\n          <div class=\"ee-list\" data-choix=\"delai\" role=\"group\" aria-label=\"Délai de vente\">\n            <button type=\"button\" class=\"ee-opt\" data-v=\"asap\">Dès que possible<\/button>\n            <button type=\"button\" class=\"ee-opt\" data-v=\"6mois\">Dans les 6 mois<\/button>\n            <button type=\"button\" class=\"ee-opt\" data-v=\"plus6mois\">Dans plus de 6 mois<\/button>\n            <button type=\"button\" class=\"ee-opt\" data-v=\"nsp\">Je ne sais pas encore<\/button>\n            <button type=\"button\" class=\"ee-opt\" data-v=\"aucun\">Pas de projet, je me renseigne<\/button>\n          <\/div>\n          <span class=\"msg\">Choisissez une réponse.<\/span>\n        <\/div>\n        <div class=\"ee-nav\"><button type=\"button\" class=\"btn\" data-prev>Retour<\/button><button type=\"button\" class=\"btn btn-primary btn-lg\" data-next>Voir mon estimation <span class=\"arw\">→<\/span><\/button><\/div>\n      <\/div>\n\n      <!-- COORDONNÉES : un seul écran, pas de mot de passe -->\n      <div class=\"ee-step\" data-s=\"contact\" tabindex=\"-1\" hidden>\n        <div class=\"ee-head\"><p class=\"label\">C'est prêt<\/p><h2 class=\"ee-q\">Votre estimation est <em>prête.<\/em><\/h2><p class=\"ee-sub\" id=\"ee-contact-sub\">Dites-nous à qui la montrer : elle s'affiche tout de suite après.<\/p><\/div>\n        <div id=\"ee-logged\" class=\"ee-who\" hidden><img data-ee-portrait alt=\"\" width=\"52\" height=\"52\" loading=\"lazy\" hidden><p><\/p><\/div>\n        <div id=\"ee-new\">\n          <div class=\"field\"><span class=\"lab\" id=\"ee-civ-lab\">Civilité<\/span><div class=\"ee-civ\" role=\"group\" aria-labelledby=\"ee-civ-lab\"><button type=\"button\" class=\"pill\" data-civ=\"Mme\">Madame<\/button><button type=\"button\" class=\"pill\" data-civ=\"M.\">Monsieur<\/button><\/div><\/div>\n          <div class=\"row2\" style=\"margin-top:18px;\">\n            <div class=\"field\"><label for=\"ee-prenom\">Prénom<\/label><input type=\"text\" id=\"ee-prenom\" autocomplete=\"given-name\" maxlength=\"80\" autocapitalize=\"words\"><span class=\"msg\">Indiquez votre prénom.<\/span><\/div>\n            <div class=\"field\"><label for=\"ee-nom\">Nom<\/label><input type=\"text\" id=\"ee-nom\" autocomplete=\"family-name\" maxlength=\"80\" autocapitalize=\"words\"><span class=\"msg\">Indiquez votre nom.<\/span><\/div>\n          <\/div>\n          <div class=\"field\" style=\"margin-top:18px;\"><label for=\"ee-email\">E-mail<\/label><input type=\"email\" id=\"ee-email\" autocomplete=\"email\" inputmode=\"email\" maxlength=\"160\" autocapitalize=\"off\" autocorrect=\"off\" spellcheck=\"false\"><span class=\"msg\">Indiquez une adresse e-mail valide (ex. prenom@exemple.fr).<\/span><\/div>\n        <\/div>\n        <div class=\"field\"><label for=\"ee-tel\">Téléphone<\/label><input type=\"tel\" id=\"ee-tel\" autocomplete=\"tel\" inputmode=\"tel\" maxlength=\"30\" placeholder=\"06 12 34 56 78\"><span class=\"msg\">Indiquez un numéro de téléphone valide (ex. 06 12 34 56 78).<\/span><\/div>\n        <div class=\"field\" id=\"ee-consent-f\"><label class=\"consent\"><input type=\"checkbox\" id=\"ee-consent\"><span>J'accepte que GRAVELIN IMMO utilise ces informations pour calculer mon estimation, créer mon espace personnel et me recontacter à ce sujet. <a href=\"/politique-de-confidentialite/#espace-estimation\" data-ee-lien=\"confidentialite\">Confidentialité<\/a><\/span><\/label><span class=\"msg\">Cochez la case pour continuer.<\/span><\/div>\n        <p class=\"ee-err\" id=\"ee-err\" role=\"alert\" hidden><\/p>\n        <div class=\"ee-nav ee-nav-fin\"><button type=\"button\" class=\"btn\" data-prev>Retour<\/button><button type=\"submit\" class=\"btn btn-primary btn-lg\" id=\"ee-submit\"><span id=\"ee-submit-txt\">Afficher mon estimation<\/span> <span class=\"arw\">→<\/span><\/button><\/div>\n        <p class=\"ee-fine\">Pas de mot de passe à créer : votre espace s'ouvre avec votre e-mail. Aucun démarchage : seul <span data-ee-txt=\"conseiller\">Shawez<\/span> vous recontacte, au sujet de ce bien.<\/p>\n      <\/div>\n    <\/form>\n\n    <!-- RÉSULTAT : affiché tout de suite, rien ne le retarde -->\n    <div class=\"ee-wrap\" id=\"ee-result\" hidden tabindex=\"-1\" aria-live=\"polite\">\n      <div class=\"ee-res tone-dark\" data-tone=\"dark\" id=\"ee-res-box\"><\/div>\n      <div class=\"ee-who\" style=\"margin-top:14px;\"><img data-ee-portrait alt=\"\" width=\"52\" height=\"52\" loading=\"lazy\" hidden><p><b><span data-ee-txt=\"conseiller\">Shawez<\/span> a reçu votre demande.<\/b> Il vous appelle pour en parler et, si vous le souhaitez, fixer une visite gratuite : c'est elle qui donne le prix juste. Ensuite, il vous remet un avis de valeur détaillé.<\/p><\/div>\n\n      <!-- après le résultat seulement : retrouver son estimation -->\n      <div class=\"ee-apres\" id=\"ee-apres\" hidden>\n        <h2 class=\"ee-q\" id=\"ee-apres-titre\"><\/h2>\n        <p class=\"ee-sub\" id=\"ee-apres-txt\"><\/p>\n        <form class=\"form ee-mdp\" id=\"ee-mdp-form\" novalidate hidden>\n          <div class=\"field\"><label for=\"ee-mdp\">Mot de passe <small>(facultatif)<\/small><\/label><div class=\"ee-pw\"><input type=\"password\" id=\"ee-mdp\" autocomplete=\"new-password\" minlength=\"8\" maxlength=\"200\" aria-describedby=\"ee-mdp-hint\"><button type=\"button\" data-voir=\"ee-mdp\" aria-pressed=\"false\">Afficher<\/button><\/div><span class=\"hint\" id=\"ee-mdp-hint\">8 caractères au moins. Vous pourrez aussi le faire plus tard, depuis votre espace.<\/span><span class=\"msg\">8 caractères au moins.<\/span><\/div>\n          <p class=\"ee-err\" role=\"alert\" hidden><\/p><p class=\"ee-ok\" role=\"status\" hidden><\/p>\n          <div class=\"ee-nav\"><span><\/span><button type=\"submit\" class=\"btn\">Enregistrer ce mot de passe<\/button><\/div>\n        <\/form>\n        <div class=\"ee-apres-liens\"><a class=\"btn btn-primary\" id=\"ee-apres-espace\" href=\"/mon-espace/\">Ouvrir mon espace <span class=\"arw\">→<\/span><\/a><button type=\"button\" class=\"ee-skip\" id=\"ee-refaire\">Estimer un autre bien<\/button><\/div>\n      <\/div>\n    <\/div>\n  <\/div>\n<\/section>\n","mon-espace":"<section class=\"route ee\" data-route=\"/mon-espace\" id=\"r-mon-espace\">\n  <div class=\"page-head shell\">\n    <p class=\"label\">Mon espace<\/p>\n    <h1 class=\"display d-xl\" style=\"margin-top:14px;\" id=\"me-titre\">Vos estimations, <em>au même endroit.<\/em><\/h1>\n    <p class=\"lede\" id=\"me-lede\">Retrouvez vos estimations et l'avancement de votre dossier avec <span data-ee-txt=\"conseiller\">Shawez<\/span>.<\/p>\n  <\/div>\n  <div class=\"shell\">\n    <div class=\"ee-wrap\" id=\"me-load\" role=\"status\" aria-label=\"Chargement\"><div class=\"ee-load\"><\/div><\/div>\n\n    <!-- non connecté -->\n    <div class=\"ee-wrap\" id=\"me-out\" hidden>\n      <p class=\"ee-ok\" id=\"me-flash\" role=\"status\" hidden><\/p>\n\n      <!-- connexion : lien reçu par e-mail, ou mot de passe pour ceux qui en ont choisi un -->\n      <form class=\"form\" id=\"me-cnx\" novalidate>\n        <div class=\"ee-step\">\n          <div class=\"ee-head\"><h2 class=\"ee-q\">Ouvrir <em>mon espace.<\/em><\/h2><p class=\"ee-sub\" id=\"me-cnx-sub\">Votre espace a été créé avec votre e-mail, le jour de votre estimation.<\/p><\/div>\n          <div class=\"field\"><label for=\"me-email\">E-mail<\/label><input type=\"email\" id=\"me-email\" autocomplete=\"username\" inputmode=\"email\" autocapitalize=\"off\" autocorrect=\"off\" spellcheck=\"false\"><span class=\"msg\">Indiquez l'e-mail de votre estimation.<\/span><\/div>\n          <div class=\"field\" id=\"me-mdp-f\"><label for=\"me-mdp\">Mot de passe <small id=\"me-mdp-opt\">(si vous en avez choisi un)<\/small><\/label><div class=\"ee-pw\"><input type=\"password\" id=\"me-mdp\" autocomplete=\"current-password\"><button type=\"button\" data-voir=\"me-mdp\" aria-pressed=\"false\">Afficher<\/button><\/div><span class=\"msg\">Indiquez votre mot de passe, ou demandez un lien par e-mail.<\/span><\/div>\n          <p class=\"ee-err\" role=\"alert\" hidden><\/p><p class=\"ee-ok\" role=\"status\" hidden><\/p>\n          <div class=\"ee-nav ee-nav-col\">\n            <button type=\"button\" class=\"btn btn-primary btn-lg\" id=\"me-lien-btn\">Recevoir mon lien de connexion <span class=\"arw\">→<\/span><\/button>\n            <button type=\"submit\" class=\"btn btn-lg\" id=\"me-cnx-btn\">Me connecter avec mon mot de passe<\/button>\n          <\/div>\n          <div class=\"ee-links\"><button type=\"button\" id=\"me-oubli-btn\">Mot de passe oublié ?<\/button><button type=\"button\" data-tab=\"ins\">Créer un espace sans estimation<\/button><a href=\"/estimer/\" data-ee-lien=\"estimer\">Faire une estimation<\/a><\/div>\n        <\/div>\n      <\/form>\n\n      <form class=\"form\" id=\"me-ins\" novalidate hidden>\n        <div class=\"hp\" aria-hidden=\"true\"><label for=\"me-hp\">Ne rien écrire ici<\/label><input type=\"text\" id=\"me-hp\" name=\"ee_hp_k7\" tabindex=\"-1\" autocomplete=\"off\" data-lpignore=\"true\" data-1p-ignore data-form-type=\"other\"><\/div>\n        <div class=\"ee-step\">\n          <div class=\"ee-head\"><h2 class=\"ee-q\">Créer <em>mon espace.<\/em><\/h2><p class=\"ee-sub\">Le plus simple reste de <a href=\"/estimer/\" data-ee-lien=\"estimer\">faire une estimation<\/a> : votre espace est créé au passage, sans mot de passe.<\/p><\/div>\n          <div class=\"field\"><span class=\"lab\" id=\"mi-civ-lab\">Civilité<\/span><div class=\"ee-civ\" role=\"group\" aria-labelledby=\"mi-civ-lab\"><button type=\"button\" class=\"pill\" data-civ=\"Mme\" aria-pressed=\"false\">Madame<\/button><button type=\"button\" class=\"pill\" data-civ=\"M.\" aria-pressed=\"false\">Monsieur<\/button><\/div><\/div>\n          <div class=\"row2\">\n            <div class=\"field\"><label for=\"mi-prenom\">Prénom<\/label><input type=\"text\" id=\"mi-prenom\" autocomplete=\"given-name\" maxlength=\"80\"><span class=\"msg\">Indiquez votre prénom.<\/span><\/div>\n            <div class=\"field\"><label for=\"mi-nom\">Nom<\/label><input type=\"text\" id=\"mi-nom\" autocomplete=\"family-name\" maxlength=\"80\"><span class=\"msg\">Indiquez votre nom.<\/span><\/div>\n          <\/div>\n          <div class=\"field\"><label for=\"mi-email\">E-mail<\/label><input type=\"email\" id=\"mi-email\" autocomplete=\"email\" inputmode=\"email\" maxlength=\"160\" autocapitalize=\"off\" autocorrect=\"off\" spellcheck=\"false\"><span class=\"msg\">Indiquez une adresse e-mail valide.<\/span><\/div>\n          <div class=\"field\"><label for=\"mi-tel\">Téléphone<\/label><input type=\"tel\" id=\"mi-tel\" autocomplete=\"tel\" inputmode=\"tel\" maxlength=\"30\"><span class=\"msg\">Indiquez un numéro valide.<\/span><\/div>\n          <div class=\"field\"><label for=\"mi-mdp\">Mot de passe<\/label><div class=\"ee-pw\"><input type=\"password\" id=\"mi-mdp\" autocomplete=\"new-password\" minlength=\"8\" aria-describedby=\"mi-mdp-hint\"><button type=\"button\" data-voir=\"mi-mdp\" aria-pressed=\"false\">Afficher<\/button><\/div><span class=\"hint\" id=\"mi-mdp-hint\">8 caractères au moins.<\/span><span class=\"msg\">8 caractères au moins.<\/span><\/div>\n          <div class=\"field\"><label class=\"consent\"><input type=\"checkbox\" id=\"mi-consent\"><span>J'accepte que GRAVELIN IMMO utilise ces informations pour gérer mon espace et me recontacter au sujet de mon projet. <a href=\"/politique-de-confidentialite/#espace-estimation\" data-ee-lien=\"confidentialite\">Confidentialité<\/a><\/span><\/label><span class=\"msg\">Cochez la case pour continuer.<\/span><\/div>\n          <p class=\"ee-err\" role=\"alert\" hidden><\/p>\n          <div class=\"ee-nav\"><button type=\"button\" class=\"btn\" data-tab=\"cnx\">Retour<\/button><button type=\"submit\" class=\"btn btn-primary btn-lg\">Créer mon espace <span class=\"arw\">→<\/span><\/button><\/div>\n        <\/div>\n      <\/form>\n\n      <form class=\"form\" id=\"me-oubli\" novalidate hidden>\n        <div class=\"ee-step\">\n          <div class=\"ee-head\"><h2 class=\"ee-q\">Mot de passe <em>oublié.<\/em><\/h2><p class=\"ee-sub\">Indiquez votre e-mail : vous recevez un lien pour en choisir un nouveau.<\/p><\/div>\n          <div class=\"field\"><label for=\"mo-email\">E-mail<\/label><input type=\"email\" id=\"mo-email\" autocomplete=\"email\" inputmode=\"email\" autocapitalize=\"off\" autocorrect=\"off\" spellcheck=\"false\"><span class=\"msg\">Indiquez votre e-mail.<\/span><\/div>\n          <p class=\"ee-ok\" role=\"status\" hidden><\/p><p class=\"ee-err\" role=\"alert\" hidden><\/p>\n          <div class=\"ee-nav\"><button type=\"button\" class=\"btn\" data-tab=\"cnx\">Retour<\/button><button type=\"submit\" class=\"btn btn-primary btn-lg\">Recevoir le lien <span class=\"arw\">→<\/span><\/button><\/div>\n        <\/div>\n      <\/form>\n\n      <form class=\"form\" id=\"me-reinit\" novalidate hidden>\n        <div class=\"ee-step\">\n          <div class=\"ee-head\"><h2 class=\"ee-q\">Nouveau <em>mot de passe.<\/em><\/h2><\/div>\n          <div class=\"field\"><label for=\"mr-mdp\">Nouveau mot de passe<\/label><div class=\"ee-pw\"><input type=\"password\" id=\"mr-mdp\" autocomplete=\"new-password\" minlength=\"8\" aria-describedby=\"mr-mdp-hint\"><button type=\"button\" data-voir=\"mr-mdp\" aria-pressed=\"false\">Afficher<\/button><\/div><span class=\"hint\" id=\"mr-mdp-hint\">8 caractères au moins.<\/span><span class=\"msg\">8 caractères au moins.<\/span><\/div>\n          <p class=\"ee-err\" role=\"alert\" hidden><\/p>\n          <div class=\"ee-nav\"><span><\/span><button type=\"submit\" class=\"btn btn-primary btn-lg\">Enregistrer <span class=\"arw\">→<\/span><\/button><\/div>\n        <\/div>\n      <\/form>\n    <\/div>\n\n    <!-- connecté -->\n    <div class=\"ee-wrap\" id=\"me-in\" hidden>\n      <p class=\"ee-ok\" id=\"me-verif-ok\" role=\"status\" hidden>Adresse e-mail confirmée. Merci !<\/p>\n      <div class=\"ee-who\" id=\"me-attente\" hidden style=\"margin-bottom:18px;\"><p><\/p><\/div>\n      <div class=\"ee-who\" id=\"me-verif\" hidden style=\"margin-bottom:18px;\"><p><b>Confirmez votre adresse e-mail<\/b> en ouvrant le lien reçu par e-mail. <button type=\"button\" class=\"ee-skip\" id=\"me-verif-btn\" style=\"margin-left:4px;\">Recevoir un nouveau lien<\/button><\/p><\/div>\n      <div class=\"ee-hello\"><div><p class=\"label\" id=\"me-bonjour\"><\/p><\/div><a class=\"btn btn-primary\" href=\"/estimer/\" data-ee-lien=\"estimer\">Nouvelle estimation <span class=\"arw\">→<\/span><\/a><\/div>\n      <div class=\"ee-cards\" id=\"me-cards\"><\/div>\n\n      <div class=\"ee-sec\">\n        <h2>Mes informations<\/h2>\n        <ul class=\"ee-kv\" id=\"me-infos\"><\/ul>\n\n        <form class=\"form ee-mdp\" id=\"me-mdp-form\" novalidate hidden style=\"margin-top:18px;\">\n          <div class=\"ee-step\">\n            <div class=\"ee-head\"><h2 class=\"ee-q ee-q-s\" id=\"me-mdp-titre\">Choisir <em>un mot de passe<\/em><\/h2><p class=\"ee-sub\" id=\"me-mdp-sub\">Facultatif : il permet de vous connecter sans attendre un e-mail.<\/p><\/div>\n            <div class=\"field\" id=\"mp-actuel-f\" hidden><label for=\"mp-actuel\">Mot de passe actuel<\/label><input type=\"password\" id=\"mp-actuel\" autocomplete=\"current-password\"><span class=\"msg\">Indiquez votre mot de passe actuel.<\/span><\/div>\n            <div class=\"field\"><label for=\"mp-mdp\">Nouveau mot de passe<\/label><div class=\"ee-pw\"><input type=\"password\" id=\"mp-mdp\" autocomplete=\"new-password\" minlength=\"8\" aria-describedby=\"mp-mdp-hint\"><button type=\"button\" data-voir=\"mp-mdp\" aria-pressed=\"false\">Afficher<\/button><\/div><span class=\"hint\" id=\"mp-mdp-hint\">8 caractères au moins.<\/span><span class=\"msg\">8 caractères au moins.<\/span><\/div>\n            <p class=\"ee-err\" role=\"alert\" hidden><\/p>\n            <div class=\"ee-nav\"><button type=\"button\" class=\"btn\" id=\"me-mdp-annule\">Annuler<\/button><button type=\"submit\" class=\"btn btn-primary\">Enregistrer<\/button><\/div>\n          <\/div>\n        <\/form>\n        <p class=\"ee-ok\" id=\"me-mdp-ok\" role=\"status\" hidden style=\"margin-top:14px;\">Mot de passe enregistré.<\/p>\n\n        <div class=\"ee-links\"><a href=\"/admin/\" id=\"me-admin\" data-ee-lien=\"admin\" hidden>Espace agence<\/a><button type=\"button\" id=\"me-mdp-btn\">Choisir un mot de passe<\/button><button type=\"button\" id=\"me-logout\">Me déconnecter<\/button><button type=\"button\" class=\"ee-danger\" id=\"me-del-btn\">Supprimer mon espace<\/button><\/div>\n        <form class=\"form\" id=\"me-del\" novalidate hidden style=\"margin-top:18px;\">\n          <div class=\"ee-step\">\n            <div class=\"ee-head\"><h2 class=\"ee-q ee-q-s\">Supprimer <em>mon espace<\/em><\/h2><p class=\"ee-sub\" id=\"md-sub\">Votre compte, vos estimations et vos fichiers sont effacés définitivement.<\/p><\/div>\n            <div class=\"field\" id=\"md-mdp-f\"><label for=\"md-mdp\">Mot de passe<\/label><input type=\"password\" id=\"md-mdp\" autocomplete=\"current-password\"><span class=\"msg\">Indiquez votre mot de passe.<\/span><\/div>\n            <div class=\"field\" id=\"md-conf-f\" hidden><label for=\"md-conf\">Écrivez SUPPRIMER pour confirmer<\/label><input type=\"text\" id=\"md-conf\" autocomplete=\"off\" autocapitalize=\"characters\"><span class=\"msg\">Écrivez SUPPRIMER (en majuscules) pour confirmer.<\/span><\/div>\n            <p class=\"ee-err\" role=\"alert\" hidden><\/p>\n            <div class=\"ee-nav\"><button type=\"button\" class=\"btn\" id=\"me-del-annule\">Annuler<\/button><button type=\"submit\" class=\"btn btn-primary\">Supprimer définitivement<\/button><\/div>\n          <\/div>\n        <\/form>\n      <\/div>\n    <\/div>\n  <\/div>\n<\/section>\n","admin":"<section class=\"route ee\" data-route=\"/admin\" id=\"r-admin\">\n  <div class=\"page-head shell\">\n    <p class=\"label\">Espace agence<\/p>\n    <h1 class=\"display d-xl\" style=\"margin-top:14px;\">Estimations <em>et comptes.<\/em><\/h1>\n    <p class=\"lede\" id=\"ad-lede\">Toutes les demandes reçues par les deux sites, leur avancement et vos notes.<\/p>\n  <\/div>\n  <div class=\"shell\">\n    <div class=\"ee-wrap\" id=\"ad-load\" role=\"status\" aria-label=\"Chargement\"><div class=\"ee-load\"><\/div><\/div>\n    <div class=\"ee-wrap\" id=\"ad-no\" hidden>\n      <div class=\"ee-empty\"><p style=\"margin:0;\" id=\"ad-no-txt\">Cet espace est réservé à l'agence. Connectez-vous avec votre compte administrateur.<\/p><a class=\"btn btn-primary\" href=\"/mon-espace/\" data-ee-lien=\"espace\">Me connecter <span class=\"arw\">→<\/span><\/a><\/div>\n    <\/div>\n    <div class=\"ee-wide\" id=\"ad-in\" hidden>\n      <div class=\"ee-stats\" id=\"ad-stats\"><\/div>\n      <div class=\"ee-tabs\" role=\"group\" aria-label=\"Vue\"><button type=\"button\" class=\"pill\" data-vue=\"demandes\" aria-pressed=\"true\">Demandes<\/button><button type=\"button\" class=\"pill\" data-vue=\"comptes\" aria-pressed=\"false\">Comptes<\/button><button type=\"button\" class=\"pill\" data-vue=\"reglages\" aria-pressed=\"false\">Google Sheet<\/button><\/div>\n      <div id=\"ad-demandes\">\n        <div class=\"ee-tools\">\n          <input type=\"search\" id=\"ad-q\" placeholder=\"Nom, e-mail, téléphone, commune, référence…\" aria-label=\"Rechercher\">\n          <select id=\"ad-site\" aria-label=\"Site\"><option value=\"\">Les deux sites<\/option><option value=\"shawez\">shawez-immo.com<\/option><option value=\"gravelin\">gravelin-immo.com<\/option><\/select>\n          <select id=\"ad-statut\" aria-label=\"Statut\"><option value=\"\">Tous les statuts<\/option><\/select>\n          <a class=\"btn\" id=\"ad-export\" href=\"/api/espace/admin/export.csv?quoi=demandes\" download>Export CSV<\/a>\n        <\/div>\n        <div class=\"ee-rows\" id=\"ad-rows\"><\/div>\n      <\/div>\n      <div id=\"ad-comptes\" hidden>\n        <div class=\"ee-tools\">\n          <input type=\"search\" id=\"ad-qc\" placeholder=\"Nom, e-mail, téléphone…\" aria-label=\"Rechercher un compte\">\n          <a class=\"btn\" id=\"ad-export-c\" href=\"/api/espace/admin/export.csv?quoi=comptes\" download>Export CSV<\/a>\n        <\/div>\n        <div class=\"ee-rows\" id=\"ad-crows\"><\/div>\n      <\/div>\n      <div id=\"ad-reglages\" hidden>\n        <div class=\"ee-card\">\n          <h3>Demandes dans Google Sheets<\/h3>\n          <p class=\"meta\">L'onglet « Site » du tableau « Relance leads » se remplit tout seul : une formule relit les demandes environ toutes les heures. Colonnes : date, site, civilité, prénom, nom, téléphone, e-mail, adresse du bien, type, surface, fourchette, délai de vente, prix idéal, statut, prochaine action, notes, référence. Le statut, la date de rappel et les notes se changent ici, dans chaque demande.<\/p>\n          <p class=\"meta\">Besoin d'une nouvelle clé (tableau partagé par erreur, par exemple) ? Le bouton en crée une et coupe l'ancienne : collez alors la nouvelle formule dans la cellule A1 de l'onglet « Site ».<\/p>\n          <div class=\"acts\"><button type=\"button\" class=\"btn\" id=\"ad-flux\">Créer une nouvelle clé<\/button><\/div>\n          <p class=\"ee-ok\" id=\"ad-flux-out\" role=\"status\" hidden><\/p>\n        <\/div>\n      <\/div>\n    <\/div>\n  <\/div>\n<\/section>\n"};
function demarrer(){
  var boite=document.querySelector('[data-espace-estimation]'); if(!boite)return;
  var page=boite.getAttribute('data-espace-estimation'); if(!FRAGMENTS[page])return;
  boite.classList.add('ee-module'); boite.innerHTML=FRAGMENTS[page];
/* Espace estimation : outils communs (estimer, mon-espace, admin).
   Le même module sert les deux sites ; ce qui change d'un site à l'autre est dans EE_CONF (défini avant ce script
   par la page, sinon valeurs de shawez-immo.com) et dans la feuille de thème. */
var EE=(function(){
  'use strict';
  var CONF={site:'',api:'/api/espace',estimer:'/estimer/',espace:'/mon-espace/',admin:'/admin/',
    tel:'+33767579228',telAffiche:'07 67 57 92 28',conseiller:'Shawez',email:'shawez@gravelin-immo.com',
    confidentialite:'/politique-de-confidentialite/#espace-estimation',portrait:''};
  var ext=window.EE_CONF||{}; Object.keys(ext).forEach(function(k){CONF[k]=ext[k];});

  function $(s,c){return (c||document).querySelector(s);}
  function $$(s,c){return Array.prototype.slice.call((c||document).querySelectorAll(s));}
  function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
  function euros(n){return n==null?'':Math.round(n).toLocaleString('fr-FR').replace(/[  ]/g,' ')+' €';}
  function date(s){try{return new Date(s).toLocaleDateString('fr-FR',{day:'numeric',month:'long',year:'numeric'});}catch(e){return s;}}
  function jour(s){ if(!s)return ''; var p=String(s).slice(0,10).split('-'); return p.length===3?p[2]+'/'+p[1]+'/'+p[0]:s; }
  function mois(s){ if(!s)return ''; try{return new Date(String(s).slice(0,10)+'T12:00:00').toLocaleDateString('fr-FR',{month:'long',year:'numeric'});}catch(e){return s;} }
  function taille(o){ return o>=1048576?(o/1048576).toLocaleString('fr-FR',{maximumFractionDigits:1})+' Mo':Math.max(1,Math.round(o/1024))+' Ko'; }
  function rayon(r){ return r>=1000?(r/1000).toLocaleString('fr-FR')+' km':r+' m'; }

  /* Appel de l'API. Délai de garde : sur un réseau lent, on rend la main avec un message clair plutôt que d'attendre sans fin. */
  function api(chemin,opts){
    opts=opts||{};
    var init={method:opts.method||'GET',credentials:'same-origin',headers:{}};
    if(opts.fichier){init.method='POST';init.body=opts.fichier;init.headers['Content-Type']=opts.fichier.type||'application/octet-stream';init.headers['X-Fichier-Nom']=encodeURIComponent(opts.nom||opts.fichier.name||'fichier');}
    else if(opts.body!==undefined){init.method=opts.method||'POST';init.headers['Content-Type']='application/json';init.body=JSON.stringify(opts.body);}
    var ctrl=window.AbortController?new AbortController():null, t=null;
    if(ctrl){init.signal=ctrl.signal;t=setTimeout(function(){ctrl.abort();},opts.delai||30000);}
    return fetch(CONF.api+chemin,init).then(function(r){
      clearTimeout(t);
      return r.json().catch(function(){return {};}).then(function(d){d=d||{};d._status=r.status;if(r.status>=500&&!d.error)d.error='serveur';return d;});
    },function(){clearTimeout(t);return {_status:0,error:'reseau'};});
  }
  var MSG={
    reseau:"La connexion a échoué ou a mis trop de temps. Vérifiez votre réseau et réessayez : rien n'est perdu.",
    trop_de_demandes:"Trop d'essais d'affilée. Réessayez dans quelques minutes.",
    identifiants:"E-mail ou mot de passe incorrect.",
    sans_mot_de_passe:"Cet espace existe, mais sans mot de passe : il a été créé pendant votre estimation.",
    serveur:"Un souci technique de notre côté. Réessayez, ou appelez "+CONF.conseiller+" au "+CONF.telAffiche+".",
    base_absente:"L'espace n'est pas encore ouvert. Appelez "+CONF.conseiller+" au "+CONF.telAffiche+".",
    compte_existe:"Un espace existe déjà avec cet e-mail.",
    champs:"Un champ est incomplet ou mal rempli.",
    jeton:"Ce lien n'est plus valable (il ne sert qu'une fois). Demandez-en un nouveau.",
    origine:"Requête refusée.",
    connexion:"Votre session a expiré : reconnectez-vous.",
    interdit:"Ce compte n'a pas accès à cette page.",
    introuvable:"Introuvable.",
    taille:"Ce fichier dépasse 10 Mo.",
    type_fichier:"Format non accepté. Envoyez une photo (JPEG, PNG, WebP, HEIC) ou un PDF.",
    pdf_attendu:"L'avis de valeur doit être un fichier PDF.",
    trop_de_fichiers:"Il y a déjà 30 fichiers sur cette estimation.",
    stockage_plein:"L'espace de stockage est plein : envoyez ce fichier par e-mail à "+CONF.email+"."
  };
  function message(d){return MSG[d&&d.error]||MSG.serveur;}
  var CHAMPS={email:"L'adresse e-mail n'est pas valide.",telephone:"Le numéro de téléphone n'est pas valide.",prenom:"Indiquez votre prénom.",nom:"Indiquez votre nom.",mot_de_passe:"Le mot de passe doit compter 8 caractères au moins.",consentement:"Cochez la case pour continuer.",adresse:"L'adresse du bien est incomplète.",surface:"La surface n'est pas valide.",confirmation:"Écrivez SUPPRIMER pour confirmer."};
  function messageChamp(d){return (d&&d.error==='champs'&&CHAMPS[d.champ])||message(d);}

  function wa(txt){return 'https://wa.me/'+CONF.tel.replace(/\D/g,'')+'?text='+encodeURIComponent(txt);}

  /* Bloc résultat (fond sombre) : la fourchette, puis d'où elle vient. */
  function resultat(res,ref,adresse){
    var h='';
    if(res&&res.fourchette){
      h+='<p class="label">Votre estimation · indicative</p>'+
        '<p class="ee-price" data-test="fourchette"><span>'+euros(res.bas)+'</span><em>–</em><span>'+euros(res.haut)+'</span></p>'+
        '<p class="ee-m2">Soit environ <b>'+euros(res.prix_m2)+'/m²</b>'+(adresse?' · '+esc(adresse):'')+'</p>'+
        '<p class="ee-warn"><span><b>Indicatif, à confirmer par une visite.</b> Le calcul ne voit ni la lumière, ni la vue, ni les finitions : c\'est la visite qui donne le prix juste.</span></p>'+
        '<ul class="ee-facts">'+
          '<li><span>Ventes comparables utilisées</span><span data-test="ventes">'+res.comparables+' ventes réelles</span></li>'+
          '<li><span>Rayon</span><span data-test="rayon">à moins de '+rayon(res.rayon)+'</span></li>'+
          '<li><span>Prix médian de ces ventes</span><span>'+euros(res.m2_quartier)+'/m²</span></li>'+
          ((res.ajustements||[]).length?'<li><span>Ajustements pour votre bien</span><span>'+res.ajustements.map(function(a){return esc(a.libelle)+' '+(a.pct>0?'+':'')+a.pct+' %';}).join('<br>')+'</span></li>':'')+
          '<li><span>Date des données</span><span data-test="donnees">Ventes DVF'+(res.annees?' '+res.annees[0]+'–'+res.annees[res.annees.length-1]:'')+(res.donnees_du?', à jour de '+mois(res.donnees_du):'')+'</span></li>'+
        '</ul>';
    } else {
      var r=res&&res.raison;
      h+='<p class="label">Votre demande est enregistrée</p>'+
        '<p class="ee-price ee-price-txt" data-test="rappel">Je vous rappelle <em>sous 24 h.</em></p>'+
        '<p class="ee-m2">'+(r==='peu_de_ventes'?"Il y a eu trop peu de ventes comparables près de chez vous"+(res.comparables!=null?' ('+res.comparables+' seulement)':'')+" pour donner une fourchette fiable. Pas de prix au hasard : "+CONF.conseiller+" l'étudie lui-même.":r==='type'?"Pour ce type de bien, l'estimation se fait sur pièces : "+CONF.conseiller+" l'étudie lui-même.":r==='hors_zone'?"Ce secteur est hors de la Côte-d'Or : "+CONF.conseiller+" vous dit ce qu'il peut faire pour vous.":CONF.conseiller+" étudie votre bien lui-même et vous donne une première fourchette au téléphone.")+'</p>'+
        (res&&res.donnees_du?'<p class="ee-warn"><span>Données des ventes réelles (DVF) à jour de '+mois(res.donnees_du)+'.</span></p>':'');
    }
    if(ref)h+='<ul class="ee-facts ee-ref"><li><span>Référence</span><span data-test="reference">'+esc(ref)+'</span></li></ul>';
    h+='<div class="btn-row">'+
      '<a class="btn btn-primary btn-lg" href="tel:'+CONF.tel+'">Prendre rendez-vous <span class="arw">→</span></a>'+
      '<a class="btn btn-ghost" href="'+wa('Bonjour '+CONF.conseiller+', je viens de faire mon estimation en ligne'+(ref?' (réf. '+ref+')':'')+'. ')+'" target="_blank" rel="noopener">WhatsApp</a>'+
    '</div>';
    return h;
  }
  function voirMdp(root){
    $$('[data-voir]',root).forEach(function(b){b.addEventListener('click',function(){var i=document.getElementById(b.getAttribute('data-voir'));var v=i.type==='password';i.type=v?'text':'password';b.textContent=v?'Masquer':'Afficher';b.setAttribute('aria-pressed',String(v));});});
  }
  /* champ en erreur : classe + aria-invalid, pour l'œil et pour les lecteurs d'écran */
  function err(el,on){
    var f=el.closest('.field'); if(f)f.classList.toggle('err',!!on);
    if(el.setAttribute){ if(on)el.setAttribute('aria-invalid','true'); else el.removeAttribute('aria-invalid'); }
    return !on;
  }
  function emailOk(v){return /^[^\s@"<>(),;:]+@[^\s@"<>(),;:]+\.[a-z]{2,}$/i.test(String(v||'').trim());}
  function telOk(v){v=String(v||'').trim();var n=v.replace(/\D/g,'').length;return /^[+\d][\d\s.\-()]{7,}$/.test(v)&&n>=9&&n<=15;}

  /* Témoin « connecté » (cookie se_ok, sans valeur secrète) : le pictogramme de l'en-tête le lit sur toutes les pages. */
  function connecte(){return /(?:^|;\s*)se_ok=1/.test(document.cookie||'');}
  function pictogramme(){ try{ if(window.EECompte)window.EECompte(); }catch(e){} }

  /* Portrait du conseiller : affiché seulement si le site en fournit un. */
  function portraits(root){ $$('img[data-ee-portrait]',root).forEach(function(i){ if(CONF.portrait){i.src=CONF.portrait;i.hidden=false;} else i.hidden=true; }); }

  /* Mémoire du parcours dans l'onglet (sessionStorage) : jamais bloquant si le navigateur la refuse. */
  var mem={
    lire:function(k){try{var v=window.sessionStorage.getItem(k);return v?JSON.parse(v):null;}catch(e){return null;}},
    ecrire:function(k,v){try{window.sessionStorage.setItem(k,JSON.stringify(v));}catch(e){}},
    effacer:function(k){try{window.sessionStorage.removeItem(k);}catch(e){}}
  };
  function uuid(){ try{ if(window.crypto&&crypto.randomUUID)return crypto.randomUUID(); }catch(e){} return 'c'+Date.now().toString(36)+Math.random().toString(36).slice(2,12)+Math.random().toString(36).slice(2,12); }

  return {CONF:CONF,$:$,$$:$$,esc:esc,euros:euros,date:date,jour:jour,mois:mois,taille:taille,rayon:rayon,api:api,message:message,messageChamp:messageChamp,resultat:resultat,voirMdp:voirMdp,err:err,emailOk:emailOk,telOk:telOk,connecte:connecte,pictogramme:pictogramme,portraits:portraits,mem:mem,uuid:uuid,TEL:CONF.tel,wa:wa};
})();

  if(page==="estimer"){
/* Parcours d'estimation /estimer/ : une question par écran, 6 étapes, puis un seul écran de coordonnées
   et le résultat tout de suite. Pas de mot de passe : le compte est créé avec l'e-mail. */
(function(){
  'use strict';
  var $=EE.$, $$=EE.$$, err=EE.err;
  var form=$('#ee-form'); if(!form)return;
  var CLE_MEM='ee-parcours-v2', DUREE_MEM=2*3600*1000;
  var ORDRE=['adresse','type','bien','atouts','prix','projet','contact'];
  var steps={}; $$('.ee-step',form).forEach(function(s){steps[s.getAttribute('data-s')]=s;});
  var barre=$$('#ee-steps li');
  var R={type:'',adresse:'',code_postal:'',commune:'',citycode:'',lat:null,lon:null,epoque:'',etat:'',delai:'',autre_type:''};
  var civ='', compte=null, cur='adresse', T0=Date.now(), CLE=EE.uuid(), pret=false;
  EE.portraits(document);
  $$('[data-ee-txt=conseiller]').forEach(function(e){e.textContent=EE.CONF.conseiller;});
  $$('[data-ee-lien=confidentialite]').forEach(function(a){a.href=EE.CONF.confidentialite;});

  /* ---------- session : déjà connecté ? ---------- */
  function appliquerCompte(){
    if(!compte)return;
    $('#ee-new').hidden=true;
    var w=$('#ee-logged'); w.hidden=false;
    $('p',w).innerHTML='Connecté en tant que <b>'+EE.esc(((compte.prenom||'')+' '+(compte.nom||'')).trim()||compte.email)+'</b>. L\'estimation sera ajoutée à votre espace.';
    $('#ee-contact-sub').textContent='Vérifiez votre numéro : '+EE.CONF.conseiller+' vous appelle pour en parler.';
    if(compte.telephone&&!$('#ee-tel').value)$('#ee-tel').value=compte.telephone;
  }
  EE.api('/moi').then(function(d){ if(d&&d.compte){compte=d.compte;appliquerCompte();} EE.pictogramme(); });

  /* ---------- étapes visibles selon le type ---------- */
  function sequence(){
    if(R.type==='autre')return ['adresse','type','bien','projet','contact'];
    return ORDRE;
  }
  function appliquerType(){
    $$('[data-pour]',form).forEach(function(el){
      var pour=el.getAttribute('data-pour').split(' ');
      el.hidden=pour.indexOf(R.type||'appartement')<0;
    });
    var autre=R.type==='autre';
    $('#ee-surface-lab').textContent=autre?'Surface approximative (facultatif)':'Surface habitable';
    $('#ee-surface-hint').textContent=autre?'Si vous la connaissez.':R.type==='maison'?'Une surface approximative suffit.':'Surface loi Carrez si vous l\'avez, sinon une surface approximative.';
  }
  var change=0;   // heure du dernier changement d'étape
  function aller(nom,focus){
    var seq=sequence(); if(seq.indexOf(nom)<0)nom=seq[0];
    if(nom!==cur)change=Date.now();
    cur=nom;
    var i=seq.indexOf(nom);
    Object.keys(steps).forEach(function(k){steps[k].hidden=(k!==nom);});
    // barre : position dans les 6 étapes numérotées
    var num=Math.min(i,5);
    if(R.type==='autre'){ num={adresse:0,type:1,bien:2,projet:5,contact:6}[nom]; }
    if(nom==='contact')num=6;
    barre.forEach(function(li,k){li.classList.toggle('done',k<num);li.classList.toggle('on',k===num);if(k===num)li.setAttribute('aria-current','step');else li.removeAttribute('aria-current');});
    var c=$('.ee-count',steps[nom]); if(c&&R.type==='autre'){ c.textContent='Étape '+(i+1)+' sur 4'; }
    else if(c){ c.textContent='Étape '+(ORDRE.indexOf(nom)+1)+' sur 6'; }
    if(focus!==false){
      var top=form.getBoundingClientRect().top+window.scrollY-80;
      if(window.scrollY>top||window.scrollY<top-window.innerHeight*0.6)window.scrollTo({top:top,behavior:'smooth'});
      steps[nom].focus({preventScroll:true});
    }
    memoriser();
  }

  /* ---------- 1. adresse ---------- */
  var inp=$('#ee-adresse'), ul=$('#ee-sugg'), picked=$('#ee-picked'), items=[], sel=-1, tmr=null, seqReq=0, rechercheKo=false;
  var SOURCES=['https://api-adresse.data.gouv.fr/search/','https://data.geopf.fr/geocodage/search'];
  function chercher(q){
    var n=++seqReq;
    var qs='?q='+encodeURIComponent(q)+'&limit=6&autocomplete=1&lat=47.32&lon=5.04';
    function essai(k){
      return fetch(SOURCES[k]+qs).then(function(r){if(!r.ok)throw 0;return r.json();}).catch(function(){ if(k+1<SOURCES.length)return essai(k+1); throw 0; });
    }
    essai(0).then(function(d){ if(n!==seqReq)return; rechercheKo=false; items=(d.features||[]).map(function(f){var p=f.properties;return {label:p.label,name:p.name,city:p.city,postcode:p.postcode,citycode:p.citycode,context:p.context,type:p.type,lon:f.geometry.coordinates[0],lat:f.geometry.coordinates[1]};}); afficher(); })
      .catch(function(){ if(n!==seqReq)return; rechercheKo=true; items=[]; afficher(); });
  }
  function afficher(){
    sel=-1; inp.removeAttribute('aria-activedescendant');
    if(!items.length){ul.hidden=true;inp.setAttribute('aria-expanded','false');return;}
    ul.innerHTML=items.map(function(it,k){return '<li role="option" id="ee-o'+k+'" aria-selected="false" data-k="'+k+'"><b>'+EE.esc(it.name)+'</b><span>'+EE.esc((it.postcode||'')+' '+(it.city||'')+(it.context?' · '+it.context.split(', ').slice(-1)[0]:''))+'</span></li>';}).join('');
    ul.hidden=false; inp.setAttribute('aria-expanded','true');
  }
  function retenue(){
    if(R.lat==null){picked.hidden=true;return;}
    $('span',picked).textContent=R.adresse_type==='municipality'?'Commune retenue : '+R.adresse+'. Ajoutez le numéro et la rue pour un calcul plus précis.':'Adresse retenue : '+R.adresse;
    picked.hidden=false;
  }
  function choisir(it){
    R.adresse=it.label; R.code_postal=it.postcode||''; R.commune=it.city||''; R.citycode=it.citycode||''; R.lat=it.lat; R.lon=it.lon; R.adresse_type=it.type||'';
    inp.value=it.label; ul.hidden=true; inp.setAttribute('aria-expanded','false');
    retenue(); err(inp,false); memoriser();
  }
  inp.addEventListener('input',function(){
    R.lat=R.lon=null; R.adresse=''; R.code_postal=''; R.commune=''; R.citycode=''; picked.hidden=true; inp.dataset.libre='';
    clearTimeout(tmr); var q=inp.value.trim();
    if(q.length<3){items=[];afficher();return;}
    tmr=setTimeout(function(){chercher(q);},180);
  });
  inp.addEventListener('keydown',function(e){
    if(e.key==='Enter'){
      e.preventDefault();
      if(!ul.hidden&&sel>=0){choisir(items[sel]);return;}
      if(!ul.hidden&&items.length===1){choisir(items[0]);return;}
      suivant(); return;
    }
    if(ul.hidden)return;
    if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();sel=(sel+(e.key==='ArrowDown'?1:-1)+items.length)%items.length;$$('li',ul).forEach(function(li,k){li.setAttribute('aria-selected',String(k===sel));});inp.setAttribute('aria-activedescendant','ee-o'+sel);}
    else if(e.key==='Escape'){ul.hidden=true;inp.setAttribute('aria-expanded','false');}
  });
  ul.addEventListener('mousedown',function(e){e.preventDefault();});
  ul.addEventListener('click',function(e){var li=e.target.closest('li');if(li)choisir(items[+li.getAttribute('data-k')]);});
  inp.addEventListener('blur',function(){setTimeout(function(){ul.hidden=true;inp.setAttribute('aria-expanded','false');},150);});

  /* ---------- 2. type ---------- */
  function presser(liste,actif){liste.forEach(function(x){x.setAttribute('aria-pressed',String(actif(x)));});}
  $$('.ee-tile',form).forEach(function(b){b.addEventListener('click',function(){
    R.type=b.getAttribute('data-type'); R.autre_type='';
    presser($$('.ee-tile',form),function(x){return x===b;});
    presser($$('[data-autre]',form),function(){return false;});
    $('#ee-type-msg').hidden=true; appliquerType(); memoriser();
    setTimeout(function(){ if(cur==='type')suivant(); },180);
  });});
  $('#ee-autre-btn').addEventListener('click',function(){var a=$('#ee-autre');a.hidden=!a.hidden;this.setAttribute('aria-expanded',String(!a.hidden));});
  $$('[data-autre]',form).forEach(function(b){b.setAttribute('aria-pressed','false');b.addEventListener('click',function(){
    R.type='autre'; R.autre_type=b.getAttribute('data-autre');
    presser($$('[data-autre]',form),function(x){return x===b;});
    presser($$('.ee-tile',form),function(){return false;});
    $('#ee-type-msg').hidden=true; appliquerType(); memoriser();
  });});

  /* ---------- 3. compteurs et choix ---------- */
  function majCompteur(s){
    var o=$('output',s), min=+s.getAttribute('data-min'), max=+s.getAttribute('data-max'), k=s.getAttribute('data-k'), v=+s.getAttribute('data-v');
    o.textContent=(k==='etage'&&v===0)?'RDC':v; $$('button',s)[0].disabled=v<=min; $$('button',s)[1].disabled=v>=max;
  }
  $$('.ee-stp',form).forEach(function(s){
    var min=+s.getAttribute('data-min'), max=+s.getAttribute('data-max'), k=s.getAttribute('data-k'), nom=$('.l',s).firstChild.textContent;
    $$('button',s)[0].setAttribute('aria-label',nom+' : moins'); $$('button',s)[1].setAttribute('aria-label',nom+' : plus');
    $$('button',s).forEach(function(b){b.addEventListener('click',function(){var v=Math.max(min,Math.min(max,+s.getAttribute('data-v')+(+b.getAttribute('data-d'))));s.setAttribute('data-v',v);majCompteur(s);
      if(k==='niveaux'){var pp=form.querySelector('input[name=plain_pied]');if(pp)pp.checked=(v===1);}
      memoriser();
    });});
    majCompteur(s);
  });
  function stp(k){return form.querySelector('.ee-stp[data-k="'+k+'"]');}
  function val(k){var s=stp(k);return s?+s.getAttribute('data-v'):null;}
  function fixer(k,v){var s=stp(k);if(s){s.setAttribute('data-v',v);majCompteur(s);}}
  $$('[data-choix]',form).forEach(function(g){
    var k=g.getAttribute('data-choix');
    $$('.ee-opt',g).forEach(function(b){b.setAttribute('aria-pressed','false');b.addEventListener('click',function(){
      R[k]=b.getAttribute('data-v'); presser($$('.ee-opt',g),function(x){return x===b;});
      err(g,false); memoriser();
      if(k==='delai')setTimeout(function(){ if(cur==='projet')suivant(); },180);
    });});
  });
  /* prix : espaces de milliers à la saisie */
  var prix=$('#ee-prix');
  prix.addEventListener('input',function(){var d=prix.value.replace(/\D/g,'').slice(0,9);prix.value=d?(+d).toLocaleString('fr-FR').replace(/[  ]/g,' '):'';});

  /* ---------- validation par étape ---------- */
  function valider(nom){
    if(nom==='adresse'){
      if(R.lat==null){
        var t=inp.value.trim();
        // la recherche d'adresses ne répond pas : on garde le texte saisi, Shawez rappellera
        if(t.length>=6&&rechercheKo){R.adresse=t;return err(inp,false);}
        // une seule proposition : on la prend
        if(items.length===1&&t.length>=3){choisir(items[0]);return true;}
        $('#ee-adresse-msg').textContent=t.length<3?'Écrivez le numéro et la rue (ex. 30 rue Bannelier, Dijon).':'Choisissez votre adresse dans la liste qui s\'affiche.';
        if(items.length&&t.length>=3){ul.hidden=false;inp.setAttribute('aria-expanded','true');}
        return err(inp,true);
      }
      return err(inp,false);
    }
    if(nom==='type'){ var ok=!!R.type&&(R.type!=='autre'||!!R.autre_type); $('#ee-type-msg').hidden=ok; $('#ee-type-msg').style.display=ok?'':'block'; return ok; }
    if(nom==='bien'){
      var s=$('#ee-surface'), v=s.value.trim().replace(',','.'), ok2=true;
      if(R.type==='autre'){ ok2=err(s,v!==''&&!(+v>=1&&+v<=100000)); return ok2; }
      ok2=err(s,!(+v>=9&&+v<=2000))&&ok2;
      if(R.type==='maison'){var t2=$('#ee-terrain');ok2=err(t2,t2.value.trim()===''||!(+t2.value>=0&&+t2.value<=1000000))&&ok2;}
      ok2=err($('[data-choix=epoque]',form),!R.epoque)&&ok2;
      ok2=err($('[data-choix=etat]',form),!R.etat)&&ok2;
      if(R.type==='appartement'&&val('etage')>val('etages_immeuble'))fixer('etages_immeuble',val('etage'));
      if(val('chambres')>=val('pieces')&&val('pieces')>1)fixer('chambres',val('pieces')-1);
      if(val('pieces')===1&&val('chambres')>1)fixer('chambres',1);
      if(!ok2){var f=steps.bien.querySelector('.field.err');if(f){f.scrollIntoView({block:'center',behavior:'smooth'});var c=f.querySelector('input,button');if(c)c.focus({preventScroll:true});}}
      return ok2;
    }
    if(nom==='prix'){ return true; }
    if(nom==='projet'){ return err($('[data-choix=delai]',form),!R.delai); }
    return true;
  }
  function suivant(){
    if(!valider(cur))return;
    var seq=sequence(), i=seq.indexOf(cur);
    if(i<seq.length-1)aller(seq[i+1]);
  }
  function precedent(){ var seq=sequence(),i=seq.indexOf(cur);if(i>0)aller(seq[i-1]); }
  /* Un double clic ne fait pas sauter une étape : le second clic tombe sur le bouton de l'étape suivante, au même
     endroit. On l'ignore (2e clic d'un double clic, ou clic dans le quart de seconde qui suit un changement d'étape). */
  function tropTot(e){ return (e&&e.detail>1)||Date.now()-change<250; }
  /* Même garde pour toute la page : après un changement d'étape, l'écran n'a plus la même hauteur, et le second clic
     d'un double clic tomberait sur un lien du pied de page. On l'avale. */
  document.addEventListener('click',function(e){ if(e.isTrusted!==false&&Date.now()-change<300&&change){e.preventDefault();e.stopPropagation();} },true);
  $$('[data-next]',form).forEach(function(b){b.addEventListener('click',function(e){ if(!tropTot(e))suivant(); });});
  $$('[data-prev]',form).forEach(function(b){b.addEventListener('click',function(e){ if(!tropTot(e))precedent(); });});
  form.addEventListener('keydown',function(e){ if(e.key==='Enter'&&e.target.tagName==='INPUT'&&e.target.type!=='checkbox'&&cur!=='contact'&&e.target!==inp){e.preventDefault();suivant();} });
  form.addEventListener('input',function(e){ if(e.target.closest('.field.err')&&e.target.id!=='ee-adresse')err(e.target,false); memoriserBientot(); });
  form.addEventListener('change',memoriserBientot);

  /* ---------- coordonnées ---------- */
  $$('[data-civ]',form).forEach(function(b){b.setAttribute('aria-pressed','false');b.addEventListener('click',function(){civ=b.getAttribute('data-civ');presser($$('[data-civ]',form),function(x){return x===b;});memoriser();});});
  function reponses(){
    var o={type:R.type,adresse:R.adresse,code_postal:R.code_postal,commune:R.commune,citycode:R.citycode,lat:R.lat,lon:R.lon,delai:R.delai};
    var p=prix.value.replace(/\D/g,''); if(p&&R.type!=='autre')o.prix_ideal=+p;
    var s=$('#ee-surface').value.trim().replace(',','.'); if(s)o.surface=Math.round(+s);
    if(R.type==='autre'){o.autre_type=R.autre_type;o.message=$('#ee-message').value.trim();return o;}
    o.pieces=val('pieces');o.chambres=val('chambres');o.epoque=R.epoque;o.etat=R.etat;
    o.terrasse=form.querySelector('input[name=terrasse]').checked;
    if(R.type==='appartement'){o.etage=val('etage');o.etages_immeuble=val('etages_immeuble');['ascenseur','balcon','cave','gardien','parking','parking_box'].forEach(function(k){o[k]=form.querySelector('input[name='+k+']').checked;});}
    else {o.terrain=Math.round(+$('#ee-terrain').value);o.niveaux=val('niveaux');['plain_pied','piscine','garage'].forEach(function(k){o[k]=form.querySelector('input[name='+k+']').checked;});}
    return o;
  }
  var envoi=false;
  function bouton(actif){ var b=$('#ee-submit'); b.disabled=!actif; b.setAttribute('aria-busy',String(!actif)); $('#ee-submit-txt').textContent=actif?'Afficher mon estimation':'Calcul en cours…'; }
  form.addEventListener('submit',function(e){
    e.preventDefault(); if(envoi)return;
    if(cur!=='contact'){suivant();return;}
    if(Date.now()-change<250)return;   // second clic d'un double clic sur « Voir mon estimation »
    var ok=true, tel=$('#ee-tel'), mail=$('#ee-email');
    mail.value=mail.value.replace(/\s+/g,'');
    if(!compte){
      ok=err($('#ee-prenom'),!$('#ee-prenom').value.trim())&&ok;
      ok=err($('#ee-nom'),!$('#ee-nom').value.trim())&&ok;
      ok=err(mail,!EE.emailOk(mail.value))&&ok;
    }
    ok=err(tel,!EE.telOk(tel.value))&&ok;
    ok=err($('#ee-consent'),!$('#ee-consent').checked)&&ok;
    var m=$('#ee-err'); m.hidden=true;
    if(!ok){var f=steps.contact.querySelector('.field.err');if(f){f.scrollIntoView({block:'center',behavior:'smooth'});var c=f.querySelector('input');if(c)c.focus({preventScroll:true});}return;}
    // tout le parcours doit être complet (au cas où l'on arrive ici par un état incomplet)
    var seq=sequence();
    for(var i=0;i<seq.length-1;i++){ if(!valider(seq[i])){aller(seq[i]);return;} }
    var corps={reponses:reponses(),consentement:true,ee_hp:$('#ee-hp').value,duree:Date.now()-T0,cle:CLE,site:EE.CONF.site||undefined,
      contact:compte?{telephone:tel.value.trim()}:{civilite:civ,prenom:$('#ee-prenom').value.trim(),nom:$('#ee-nom').value.trim(),email:mail.value.trim(),telephone:tel.value.trim()}};
    envoi=true; bouton(false);
    EE.api('/estimation',{body:corps,delai:45000}).then(function(d){
      envoi=false; bouton(true);
      if(d._status===200||d._status===201){
        var etat={resultat:d.resultat,reference:d.reference,adresse:R.adresse,espace:d.espace||{},email:compte?compte.email:mail.value.trim(),mdp:false};
        memoriser(etat);
        montrer(etat,true);
        try{ if(window.beTracker)window.beTracker.t({hash:'33710f67a0c16d7cbb94d1b2ba10e7a8'}); }catch(x){}
        return;
      }
      if(d.error==='champs'&&d.champ){
        var map={telephone:'#ee-tel',email:'#ee-email',prenom:'#ee-prenom',nom:'#ee-nom',consentement:'#ee-consent'};
        if(map[d.champ]){err($(map[d.champ]),true);$(map[d.champ]).focus();return;}
        var retour={adresse:'adresse',code_postal:'adresse',lat:'adresse',lon:'adresse',surface:'bien',terrain:'bien',pieces:'bien',chambres:'bien',epoque:'bien',etat:'bien',type:'type',autre_type:'type',delai:'projet'}[d.champ];
        if(retour){aller(retour);valider(retour);return;}
      }
      m.textContent=EE.messageChamp(d); m.hidden=false; m.scrollIntoView({block:'center',behavior:'smooth'});
    });
  });

  /* ---------- résultat, puis (après seulement) de quoi le retrouver ---------- */
  function montrer(etat,defiler){
    form.hidden=true;
    $('#ee-res-box').innerHTML=EE.resultat(etat.resultat,etat.reference,etat.adresse);
    var res=$('#ee-result'); res.hidden=false;
    apres(etat);
    EE.pictogramme();
    if(defiler){ window.scrollTo({top:res.getBoundingClientRect().top+window.scrollY-90,behavior:'smooth'}); res.focus({preventScroll:true}); }
  }
  function apres(etat){
    var e=etat.espace||{}, box=$('#ee-apres'), titre=$('#ee-apres-titre'), txt=$('#ee-apres-txt'), f=$('#ee-mdp-form'), lien=$('#ee-apres-espace');
    var mail='<b>'+EE.esc(etat.email||'')+'</b>';
    box.hidden=false; f.hidden=true; lien.hidden=false; lien.href=EE.CONF.espace;
    if(e.connecte){
      titre.innerHTML='Retrouvez-la <em>quand vous voulez.</em>';
      if(e.nouveau){
        txt.innerHTML='Votre espace est créé avec '+mail+' : cette estimation y est rangée, avec l\'avancement de votre dossier.'+(e.lien==='envoye'?' Un e-mail vient de partir avec votre estimation et un lien pour y revenir.':'');
        if(!etat.mdp&&!e.mot_de_passe){
          f.hidden=false;
          $('#ee-mdp-hint').textContent=e.lien==='envoye'?'8 caractères au moins. Facultatif : le lien reçu par e-mail suffit.':'8 caractères au moins. Facultatif, mais utile pour retrouver votre estimation depuis un autre appareil.';
        } else if(etat.mdp){ txt.innerHTML+=' Votre mot de passe est enregistré.'; }
      } else {
        txt.innerHTML='Cette estimation est ajoutée à votre espace.';
      }
    } else if(e.existant){
      titre.innerHTML='Vous avez déjà <em>un espace.</em>';
      lien.href=EE.CONF.espace+'?email='+encodeURIComponent(etat.email||'');
      lien.firstChild.textContent='Me connecter ';
      txt.innerHTML='Un espace existe déjà avec '+mail+' : cette estimation y est rangée.'+
        (e.lien==='envoye'?' Ouvrez le lien que nous venons de vous envoyer par e-mail pour la retrouver.'
          :e.en_attente?' Elle y apparaîtra dès que votre adresse e-mail sera confirmée : '+EE.esc(EE.CONF.conseiller)+' vous envoie un lien de connexion quand il vous appelle.'
          :' Connectez-vous pour la retrouver.');
    } else { box.hidden=true; }
  }
  EE.voirMdp(document);
  $('#ee-mdp-form').addEventListener('submit',function(e){
    e.preventDefault(); var f=this, i=$('#ee-mdp'), ko=$('.ee-err',f), ok=$('.ee-ok',f);
    ko.hidden=true; ok.hidden=true;
    if(!err(i,i.value.trim().length<8)){i.focus();return;}
    var b=$('[type=submit]',f); b.disabled=true;
    EE.api('/mot-de-passe/definir',{body:{mot_de_passe:i.value}}).then(function(d){
      b.disabled=false;
      if(d._status===200){
        i.value=''; $('.field',f).hidden=true; $('.ee-nav',f).hidden=true;
        ok.textContent='Mot de passe enregistré. Vous pourrez vous connecter avec votre e-mail et ce mot de passe.'; ok.hidden=false;
        var m=EE.mem.lire(CLE_MEM); if(m&&m.fini){m.fini.mdp=true;EE.mem.ecrire(CLE_MEM,m);}
        return;
      }
      ko.textContent=d.error==='connexion'?'Votre session a expiré. Ouvrez votre espace pour choisir un mot de passe.':EE.messageChamp(d); ko.hidden=false;
    });
  });
  $('#ee-refaire').addEventListener('click',function(){ EE.mem.effacer(CLE_MEM); location.href=EE.CONF.estimer; });

  /* ---------- mémoire du parcours : un rechargement ne fait rien perdre ---------- */
  var tm=null;
  function memoriserBientot(){ clearTimeout(tm); tm=setTimeout(function(){memoriser();},250); }
  function memoriser(fini){
    if(!pret)return;
    var ancien=EE.mem.lire(CLE_MEM)||{};
    var m={v:2,t0:T0,cle:CLE,cur:cur,R:R,civ:civ,libre:inp.dataset.libre||'',adresseSaisie:inp.value,
      champs:{},compteurs:{},coches:{},autreOuvert:!$('#ee-autre').hidden,fini:fini||ancien.fini||null};
    ['ee-surface','ee-terrain','ee-prix','ee-message','ee-prenom','ee-nom','ee-email','ee-tel'].forEach(function(id){var el=document.getElementById(id);if(el)m.champs[id]=el.value;});
    $$('.ee-stp',form).forEach(function(s){m.compteurs[s.getAttribute('data-k')]=+s.getAttribute('data-v');});
    $$('.ee-check input, #ee-consent',form).forEach(function(c){m.coches[c.name||c.id]=c.checked;});
    EE.mem.ecrire(CLE_MEM,m);
  }
  function restaurer(){
    var m=EE.mem.lire(CLE_MEM);
    if(!m||m.v!==2||!m.t0||Date.now()-m.t0>DUREE_MEM){EE.mem.effacer(CLE_MEM);return false;}
    T0=m.t0; CLE=m.cle||CLE; civ=m.civ||'';
    Object.keys(m.R||{}).forEach(function(k){R[k]=m.R[k];});
    Object.keys(m.champs||{}).forEach(function(id){var el=document.getElementById(id);if(el&&m.champs[id]!=null)el.value=m.champs[id];});
    Object.keys(m.compteurs||{}).forEach(function(k){fixer(k,m.compteurs[k]);});
    Object.keys(m.coches||{}).forEach(function(k){var c=form.querySelector('input[name="'+k+'"]')||document.getElementById(k);if(c)c.checked=!!m.coches[k];});
    inp.value=m.adresseSaisie||R.adresse||''; if(m.libre)inp.dataset.libre=m.libre;
    retenue();
    presser($$('.ee-tile',form),function(x){return x.getAttribute('data-type')===R.type;});
    presser($$('[data-autre]',form),function(x){return R.type==='autre'&&x.getAttribute('data-autre')===R.autre_type;});
    if(m.autreOuvert||R.type==='autre'){$('#ee-autre').hidden=false;$('#ee-autre-btn').setAttribute('aria-expanded','true');}
    $$('[data-choix]',form).forEach(function(g){var k=g.getAttribute('data-choix');presser($$('.ee-opt',g),function(x){return x.getAttribute('data-v')===R[k];});});
    presser($$('[data-civ]',form),function(x){return x.getAttribute('data-civ')===civ;});
    appliquerType();
    if(m.fini){ pret=true; montrer(m.fini,false); return true; }
    // on revient à l'étape en cours, sans dépasser la première étape incomplète
    var seq=sequence(), cible=seq.indexOf(m.cur); if(cible<0)cible=0;
    var i=0; pret=false;
    while(i<cible&&valider(seq[i]))i++;
    $$('.field.err',form).forEach(function(f){f.classList.remove('err');}); $('#ee-type-msg').hidden=true; $('#ee-type-msg').style.display='';
    pret=true; aller(seq[i],false);
    return true;
  }

  appliquerType();
  if(!restaurer()){
    pret=true; aller('adresse',false);
    /* adresse passée dans l'URL (?adresse=…) : on pré-remplit */
    var q=new URLSearchParams(location.search).get('adresse'); if(q){inp.value=q;chercher(q);}
  }
})();

  }
  else if(page==="mon-espace"){
/* /mon-espace/ : connexion (lien reçu par e-mail ou mot de passe), estimations, avancement, avis de valeur, photos et documents */
(function(){
  'use strict';
  var $=EE.$, $$=EE.$$, err=EE.err, C=EE.CONF;
  var out=$('#me-out'), inn=$('#me-in'), load=$('#me-load');
  var qs=new URLSearchParams(location.search);
  var civ='', compte=null, lienPossible=false, TAILLE_MAX=10*1024*1024;
  EE.voirMdp(document);
  $$('[data-ee-txt=conseiller]').forEach(function(e){e.textContent=C.conseiller;});
  $$('[data-ee-lien]').forEach(function(a){var k=a.getAttribute('data-ee-lien');if(C[k])a.href=C[k];});

  function msg(form,txt,ok){var e=$(ok?'.ee-ok':'.ee-err',form);if(!e)return;if(ok){var k=$('.ee-err',form);if(k)k.hidden=true;}else{var o=$('.ee-ok',form);if(o)o.hidden=true;}e.innerHTML=txt||'';e.hidden=!txt;}
  function flash(txt,ok){var f=$('#me-flash');f.className=ok?'ee-ok':'ee-err';f.textContent=txt;f.hidden=!txt;}
  function onglet(t){
    ['cnx','ins','oubli','reinit'].forEach(function(k){$('#me-'+k).hidden=(k!==t);});
    var f=$('#me-'+t), c=f&&f.querySelector('input:not([tabindex="-1"])'); if(c&&t!=='cnx')c.focus({preventScroll:true});
  }
  $$('[data-tab]').forEach(function(b){b.addEventListener('click',function(){onglet(b.getAttribute('data-tab'));});});
  $('#me-oubli-btn').addEventListener('click',function(){$('#mo-email').value=$('#me-email').value;onglet('oubli');});
  $$('[data-civ]').forEach(function(b){b.addEventListener('click',function(){civ=b.getAttribute('data-civ');$$('[data-civ]').forEach(function(x){x.setAttribute('aria-pressed',String(x===b));});});});
  var aide='Demandez-le à '+EE.esc(C.conseiller)+' : <a href="tel:'+C.tel+'">'+C.telAffiche+'</a> (appel ou WhatsApp).';

  /* ---------- estimations ---------- */
  var ETAPES=[['recue','Demande reçue'],['visite','Visite prévue'],['avis','Avis de valeur envoyé']];
  var TYPES={appartement:'Appartement',maison:'Maison',autre:'Bien'};
  function lienFichier(f){return C.api+'/fichier?id='+encodeURIComponent(f.id);}
  function fichier(f){
    var img=/^image\/(jpeg|png|webp)$/.test(f.type);
    return '<li data-fid="'+EE.esc(f.id)+'">'+
      '<a href="'+lienFichier(f)+'"'+(img?' target="_blank" rel="noopener"':' download="'+EE.esc(f.nom)+'"')+'>'+(img?'<img src="'+lienFichier(f)+'" alt="" loading="lazy" width="56" height="56">':'<i aria-hidden="true">'+(f.type==='application/pdf'?'PDF':'DOC')+'</i>')+
      '<span><b>'+EE.esc(f.nom)+'</b><small>'+EE.taille(f.taille)+(f.depose_par==='agence'?' · déposé par '+EE.esc(C.conseiller):'')+'</small></span></a>'+
      (f.depose_par==='client'?'<button type="button" data-suppr="'+EE.esc(f.id)+'" aria-label="Retirer '+EE.esc(f.nom)+'">Retirer</button>':'')+'</li>';
  }
  function carte(d){
    var rang={recue:0,appele:0,visite:1,avis:2,close:2}[d.statut]||0;
    var titre=(TYPES[d.type]||'Bien')+(d.surface?' · '+d.surface+' m²':'')+(d.pieces?' · '+d.pieces+' p.':'');
    var avis=(d.fichiers||[]).filter(function(f){return f.role==='avis';}), autres=(d.fichiers||[]).filter(function(f){return f.role!=='avis';});
    return '<article class="ee-card" data-id="'+d.id+'">'+
      '<div><h3>'+EE.esc(titre)+'</h3><p class="meta">'+EE.esc(d.adresse||d.commune||'')+'</p></div>'+
      (d.prix_bas?'<div><p class="fp">'+EE.euros(d.prix_bas)+' – '+EE.euros(d.prix_haut)+'</p><p class="meta">Environ '+EE.euros(d.prix_m2)+'/m² · '+d.comparables+' ventes comparables'+(d.rayon?' à moins de '+EE.rayon(d.rayon):'')+(d.donnees_du?' · données à jour de '+EE.mois(d.donnees_du):'')+' · indicatif, à confirmer par une visite</p></div>'
        :'<div><p class="fp fp-txt">Étude personnalisée</p><p class="meta">'+EE.esc(C.conseiller)+' étudie votre bien lui-même et vous rappelle.</p></div>')+
      '<ol class="ee-tl" aria-label="Avancement">'+ETAPES.map(function(e,k){return '<li class="'+(k<=rang?'done':'')+'"'+(k===rang?' aria-current="step"':'')+'>'+e[1]+'</li>';}).join('')+'</ol>'+
      (avis.length?'<div class="ee-avis">'+avis.map(function(f){return '<a class="btn btn-primary" href="'+lienFichier(f)+'" download="'+EE.esc(f.nom)+'">Télécharger mon avis de valeur (PDF) <span class="arw">↓</span></a>';}).join('')+'</div>'
        :rang>=2&&d.statut!=='close'?'<p class="meta">Votre avis de valeur vous a été remis ; il sera aussi déposé ici.</p>':'')+
      '<div class="ee-files"><p class="lab">Photos et documents</p>'+
        '<ul class="ee-flist">'+autres.map(fichier).join('')+'</ul>'+
        '<label class="btn ee-add"><input type="file" multiple accept="image/jpeg,image/png,image/webp,image/heic,image/heif,application/pdf" data-ajout="'+d.id+'">Ajouter des photos ou des documents</label>'+
        '<p class="hint">Photos (JPEG, PNG, HEIC) ou PDF, 10 Mo au plus par fichier. Seuls '+EE.esc(C.conseiller)+' et l\'agence les voient.</p>'+
        '<p class="ee-err" role="alert" hidden></p><p class="ee-ok" role="status" hidden></p></div>'+
      '<p class="meta">Réf. '+EE.esc(d.reference)+' · le '+EE.date(d.cree_le)+(d.statut==='close'?' · dossier clos':'')+'</p>'+
    '</article>';
  }
  function afficher(d){
    load.hidden=true;
    lienPossible=d.email!==false;
    if(d.taille_max)TAILLE_MAX=d.taille_max;
    compte=d.compte||null;
    EE.pictogramme();
    if(!compte){
      out.hidden=false; inn.hidden=true;
      // l'envoi de liens aux clients est ouvert : le lien d'abord ; sinon le mot de passe d'abord
      var bl=$('#me-lien-btn'), bc=$('#me-cnx-btn');
      if(lienPossible){ bl.className='btn btn-primary btn-lg'; bc.className='btn btn-lg'; }
      else { bl.className='btn btn-lg'; bc.className='btn btn-primary btn-lg'; bc.parentNode.insertBefore(bc,bl); bl.firstChild.textContent='Recevoir un lien par e-mail '; bc.textContent='Me connecter'; $('#me-mdp-opt').textContent=''; $('#me-cnx-sub').textContent='Connectez-vous avec le mot de passe choisi après votre estimation.'; }
      if(qs.get('email')&&!$('#me-email').value)$('#me-email').value=qs.get('email');
      if(qs.get('reinit'))onglet('reinit'); else if(qs.get('oubli'))onglet('oubli'); else onglet('cnx');
      if(qs.get('verifie')==='0')flash('Ce lien de confirmation n\'est plus valable. Connectez-vous pour en recevoir un nouveau.');
      return;
    }
    var c=compte;
    out.hidden=true; inn.hidden=false;
    $('#me-titre').innerHTML=(c.prenom?'Bonjour '+EE.esc(c.prenom)+', <em>voici votre espace.</em>':'Bonjour, <em>voici votre espace.</em>');
    $('#me-lede').textContent=d.demandes.length?'Vos estimations et l\'avancement de chaque dossier.':'Vous n\'avez pas encore d\'estimation.';
    $('#me-bonjour').textContent=d.demandes.length+' estimation'+(d.demandes.length>1?'s':'');
    $('#me-cards').innerHTML=d.demandes.length?d.demandes.map(carte).join(''):'<div class="ee-empty"><p style="margin:0;">Deux minutes suffisent pour connaître la fourchette de prix de votre bien.</p><a class="btn btn-primary" href="'+C.estimer+'">Estimer mon bien <span class="arw">→</span></a></div>';
    $('#me-infos').innerHTML=[['Nom',[c.civilite,c.prenom,c.nom].filter(Boolean).join(' ')],['E-mail',c.email+(c.verifie?' (confirmé)':'')],['Téléphone',c.telephone||'—'],['Mot de passe',c.mot_de_passe?'défini':'aucun (connexion par lien)'],['Espace créé le',EE.date(c.cree_le)]].map(function(l){return '<li><span>'+l[0]+'</span><span>'+EE.esc(l[1])+'</span></li>';}).join('');
    $('#me-admin').hidden=!c.admin;
    $('#me-mdp-btn').textContent=c.mot_de_passe?'Changer mon mot de passe':'Choisir un mot de passe';
    $('#me-verif').hidden=!!c.verifie||!lienPossible;
    var att=$('#me-attente'); att.hidden=!d.en_attente;
    if(d.en_attente){
      $('p',att).innerHTML='<b>'+d.en_attente+' estimation'+(d.en_attente>1?'s attendent':' attend')+' la confirmation de votre e-mail</b> (faite'+(d.en_attente>1?'s':'')+' sans être connecté). '+
        (lienPossible?'<button type="button" class="ee-skip" id="me-att-btn">Recevoir le lien de confirmation</button>':'Un lien de connexion suffit pour la faire apparaître. '+aide);
      var ab=$('#me-att-btn'); if(ab)ab.addEventListener('click',function(){ab.disabled=true;EE.api('/lien',{body:{email:c.email}}).then(function(r){ab.textContent=r.envoye?'Lien envoyé : ouvrez-le depuis votre boîte e-mail':'Envoi impossible pour le moment';});});
    }
    if(qs.get('verifie')==='1')$('#me-verif-ok').hidden=false;
    if(qs.get('verifie')||qs.get('reinit')||qs.get('lien')||qs.get('email'))history.replaceState(null,'',location.pathname);
  }
  function charger(){ return EE.api('/moi').then(function(d){ if(d._status!==200){load.hidden=true;out.hidden=false;onglet('cnx');msg($('#me-cnx'),EE.message(d));return;} afficher(d); }); }

  /* ---------- connexion par lien ---------- */
  $('#me-lien-btn').addEventListener('click',function(){
    var f=$('#me-cnx'), b=this, m=$('#me-email'); m.value=m.value.replace(/\s+/g,'');
    err($('#me-mdp'),false);
    if(!err(m,!EE.emailOk(m.value))){m.focus();return;}
    msg(f,''); b.disabled=true;
    EE.api('/lien',{body:{email:m.value,site:C.site||undefined}}).then(function(d){
      b.disabled=false;
      if(d._status!==200){msg(f,EE.messageChamp(d));return;}
      if(d.envoye)msg(f,'Si un espace existe avec cette adresse, un lien de connexion vient d\'y être envoyé. Il est valable 30 minutes et ne sert qu\'une fois. Pensez à regarder dans les indésirables.',true);
      else msg(f,'L\'envoi de liens par e-mail n\'est pas encore ouvert. Connectez-vous avec votre mot de passe si vous en avez choisi un. Sinon, un lien de connexion suffit : '+aide);
    });
  });
  /* ---------- connexion par mot de passe ---------- */
  $('#me-cnx').addEventListener('submit',function(e){
    e.preventDefault(); var f=this, ok=true, m=$('#me-email'); m.value=m.value.replace(/\s+/g,'');
    ok=err(m,!EE.emailOk(m.value))&&ok; ok=err($('#me-mdp'),!$('#me-mdp').value)&&ok; if(!ok){(f.querySelector('.field.err input')||m).focus();return;}
    msg(f,''); var b=$('#me-cnx-btn'); b.disabled=true;
    EE.api('/connexion',{body:{email:m.value,mot_de_passe:$('#me-mdp').value}}).then(function(d){
      b.disabled=false;
      if(d._status===200){ $('#me-mdp').value=''; charger(); window.scrollTo({top:0}); return; }
      if(d.error==='sans_mot_de_passe'){ msg(f,'Cet espace existe bien, mais sans mot de passe : il a été créé pendant votre estimation. '+(d.lien||lienPossible?'Cliquez sur « Recevoir mon lien de connexion ».':'Un lien de connexion suffit pour l\'ouvrir. '+aide)); return; }
      if(d.error==='identifiants'){ msg(f,'E-mail ou mot de passe incorrect. Si vous n\'avez jamais choisi de mot de passe, '+(lienPossible?'demandez plutôt un lien de connexion.':'un lien de connexion suffit : '+aide)); return; }
      msg(f,EE.messageChamp(d));
    });
  });
  /* ---------- création sans estimation ---------- */
  $('#me-ins').addEventListener('submit',function(e){
    e.preventDefault(); var f=this, ok=true; $('#mi-email').value=$('#mi-email').value.replace(/\s+/g,'');
    ok=err($('#mi-prenom'),!$('#mi-prenom').value.trim())&&ok; ok=err($('#mi-nom'),!$('#mi-nom').value.trim())&&ok;
    ok=err($('#mi-email'),!EE.emailOk($('#mi-email').value))&&ok;
    ok=err($('#mi-tel'),!EE.telOk($('#mi-tel').value))&&ok;
    ok=err($('#mi-mdp'),$('#mi-mdp').value.trim().length<8)&&ok; ok=err($('#mi-consent'),!$('#mi-consent').checked)&&ok;
    if(!ok){var k=f.querySelector('.field.err input');if(k)k.focus();return;} msg(f,''); var b=$('[type=submit]',f); b.disabled=true;
    EE.api('/inscription',{body:{civilite:civ,prenom:$('#mi-prenom').value.trim(),nom:$('#mi-nom').value.trim(),email:$('#mi-email').value.trim(),telephone:$('#mi-tel').value.trim(),mot_de_passe:$('#mi-mdp').value,consentement:true,ee_hp:$('#me-hp').value,site:C.site||undefined}}).then(function(d){
      b.disabled=false; if(d._status===201){charger();window.scrollTo({top:0});} else msg(f,d.error==='compte_existe'?'Un espace existe déjà avec cet e-mail : connectez-vous.':EE.messageChamp(d));
    });
  });
  /* ---------- mot de passe oublié ---------- */
  $('#me-oubli').addEventListener('submit',function(e){
    e.preventDefault(); var f=this, m=$('#mo-email'); m.value=m.value.replace(/\s+/g,''); if(!err(m,!EE.emailOk(m.value)))return;
    msg(f,'');
    EE.api('/mot-de-passe/oubli',{body:{email:m.value,site:C.site||undefined}}).then(function(d){
      if(d._status!==200){msg(f,EE.messageChamp(d));return;}
      if(d.envoye)msg(f,'Si un espace existe avec cette adresse, un lien vient d\'y être envoyé (pensez aux indésirables). Il est valable 1 heure.',true);
      else msg(f,'L\'envoi de liens par e-mail n\'est pas encore ouvert. '+aide+' Il vous envoie un lien pour choisir un nouveau mot de passe.');
    });
  });
  /* ---------- nouveau mot de passe (lien reçu) ---------- */
  $('#me-reinit').addEventListener('submit',function(e){
    e.preventDefault(); var f=this; if(!err($('#mr-mdp'),$('#mr-mdp').value.trim().length<8))return;
    EE.api('/mot-de-passe/reinit',{body:{jeton:qs.get('reinit'),mot_de_passe:$('#mr-mdp').value}}).then(function(d){
      if(d._status===200){history.replaceState(null,'',location.pathname);qs=new URLSearchParams();charger();} else msg(f,EE.messageChamp(d));
    });
  });

  /* ---------- connecté ---------- */
  $('#me-logout').addEventListener('click',function(){EE.api('/deconnexion',{body:{}}).then(function(){location.href=C.espace;});});
  $('#me-verif-btn').addEventListener('click',function(){var b=this;b.disabled=true;EE.api('/verification',{body:{}}).then(function(d){b.textContent=d.envoye?'Lien envoyé':'Envoi impossible pour le moment';});});
  /* choisir ou changer son mot de passe */
  $('#me-mdp-btn').addEventListener('click',function(){
    var f=$('#me-mdp-form'); f.hidden=false; $('#me-mdp-ok').hidden=true; msg(f,'');
    $('#mp-actuel-f').hidden=!compte.mot_de_passe;
    $('#me-mdp-titre').innerHTML=compte.mot_de_passe?'Changer <em>mon mot de passe</em>':'Choisir <em>un mot de passe</em>';
    $('#me-mdp-sub').textContent=compte.mot_de_passe?'Les autres appareils connectés seront déconnectés.':'Facultatif : il permet de vous connecter sans attendre un e-mail.';
    (compte.mot_de_passe?$('#mp-actuel'):$('#mp-mdp')).focus();
  });
  $('#me-mdp-annule').addEventListener('click',function(){$('#me-mdp-form').hidden=true;});
  $('#me-mdp-form').addEventListener('submit',function(e){
    e.preventDefault(); var f=this;
    if(!err($('#mp-mdp'),$('#mp-mdp').value.trim().length<8)){$('#mp-mdp').focus();return;}
    var b=$('[type=submit]',f); b.disabled=true; msg(f,'');
    EE.api('/mot-de-passe/definir',{body:{mot_de_passe:$('#mp-mdp').value,actuel:$('#mp-actuel').value}}).then(function(d){
      b.disabled=false;
      if(d._status===200){ $('#mp-mdp').value='';$('#mp-actuel').value=''; f.hidden=true; $('#me-mdp-ok').hidden=false; charger(); return; }
      msg(f,d.error==='identifiants'?'Le mot de passe actuel est incorrect.':EE.messageChamp(d));
    });
  });
  /* suppression du compte */
  function modeSuppr(parMdp){ $('#md-mdp-f').hidden=!parMdp; $('#md-conf-f').hidden=parMdp; }
  $('#me-del-btn').addEventListener('click',function(){$('#me-del').hidden=false;modeSuppr(!!compte.mot_de_passe);(compte.mot_de_passe?$('#md-mdp'):$('#md-conf')).focus();});
  $('#me-del-annule').addEventListener('click',function(){$('#me-del').hidden=true;});
  $('#me-del').addEventListener('submit',function(e){
    e.preventDefault(); var f=this;
    EE.api('/compte/supprimer',{body:{mot_de_passe:$('#md-mdp').value,confirmation:$('#md-conf').value}}).then(function(d){
      if(d._status===200){location.href='/';return;}
      if(d.error==='champs'&&d.champ==='confirmation'){modeSuppr(false);err($('#md-conf'),true);$('#md-conf').focus();return;}
      msg(f,d.error==='identifiants'?'Mot de passe incorrect.':EE.messageChamp(d));
    });
  });

  /* ---------- photos et documents ---------- */
  // Les grandes photos sont allégées dans le navigateur avant l'envoi (2 400 px au plus) : plus rapide, même en 4G.
  function alleger(file){
    if(!/^image\/(jpeg|png|webp)$/.test(file.type)||file.size<1500000||!window.createImageBitmap)return Promise.resolve(file);
    return createImageBitmap(file).then(function(bmp){
      var r=Math.min(1,2400/Math.max(bmp.width,bmp.height)), c=document.createElement('canvas');
      c.width=Math.round(bmp.width*r); c.height=Math.round(bmp.height*r);
      c.getContext('2d').drawImage(bmp,0,0,c.width,c.height);
      return new Promise(function(res){ c.toBlob(function(b){res(b&&b.size<file.size?b:file);},'image/jpeg',0.85); });
    }).catch(function(){return file;});
  }
  $('#me-cards').addEventListener('change',function(e){
    var input=e.target.closest('[data-ajout]'); if(!input||!input.files||!input.files.length)return;
    var card=input.closest('.ee-card'), zone=$('.ee-files',card), liste=$('.ee-flist',card), id=input.getAttribute('data-ajout');
    var fichiers=Array.prototype.slice.call(input.files), n=0, erreurs=[], lab=input.parentNode;
    msg(zone,''); lab.classList.add('busy'); input.disabled=true;
    function suite(){
      if(n>=fichiers.length){
        lab.classList.remove('busy'); input.disabled=false; input.value='';
        if(erreurs.length)msg(zone,erreurs.map(EE.esc).join('<br>'));
        else msg(zone,fichiers.length>1?fichiers.length+' fichiers ajoutés.':'Fichier ajouté.',true);
        return;
      }
      var f=fichiers[n++];
      msg(zone,'Envoi '+n+' sur '+fichiers.length+'…',true);
      alleger(f).then(function(b){
        if(b.size>TAILLE_MAX){erreurs.push(f.name+' : plus de 10 Mo.');return suite();}
        return EE.api('/fichier?demande='+id+'&role='+(f.type==='application/pdf'?'document':'photo'),{fichier:b,nom:f.name,delai:120000}).then(function(d){
          if(d._status===201)liste.insertAdjacentHTML('beforeend',fichier(d.fichier));
          else erreurs.push(f.name+' : '+EE.message(d));
          suite();
        });
      });
    }
    suite();
  });
  $('#me-cards').addEventListener('click',function(e){
    var b=e.target.closest('[data-suppr]'); if(!b)return;
    if(b.getAttribute('data-ok')!=='1'){b.setAttribute('data-ok','1');b.textContent='Confirmer';return;}
    b.disabled=true;
    EE.api('/fichier/supprimer',{body:{id:b.getAttribute('data-suppr')}}).then(function(d){ if(d._status===200){var li=b.closest('li');li.parentNode.removeChild(li);} else {b.disabled=false;b.textContent=EE.message(d);} });
  });

  /* ---------- arrivée par un lien de connexion (?lien=…) : la page l'échange contre une session ---------- */
  if(qs.get('lien')){
    EE.api('/lien/ouvrir',{body:{jeton:qs.get('lien')}}).then(function(d){
      history.replaceState(null,'',location.pathname);
      var ok=d._status===200;
      qs=new URLSearchParams();
      charger().then(function(){
        if(ok&&d.mot_de_passe_retire){var n=$('#me-mdp-ok');n.textContent='Votre adresse e-mail est confirmée. Par sécurité, le mot de passe choisi avant cette confirmation a été retiré : vous pouvez en choisir un nouveau ci-dessous.';n.hidden=false;}
        if(!ok&&!compte)flash(d.error==='jeton'?'Ce lien de connexion n\'est plus valable : il dure 30 minutes et ne sert qu\'une fois. Demandez-en un nouveau ci-dessous.':EE.message(d));
      });
    });
  } else charger();
})();

  }
  else if(page==="admin"){
/* /admin/ : toutes les demandes des deux sites et tous les comptes ; statut, rappel, notes, fichiers, export CSV */
(function(){
  'use strict';
  var $=EE.$, $$=EE.$$, C=EE.CONF;
  var D=[], Cp=[], STATUTS={}, TAILLE_MAX=10*1024*1024;
  $$('[data-ee-lien]').forEach(function(a){var k=a.getAttribute('data-ee-lien');if(C[k])a.href=C[k];});
  $('#ad-export').href=C.api+'/admin/export.csv?quoi=demandes'; $('#ad-export-c').href=C.api+'/admin/export.csv?quoi=comptes';
  var LIB={
    delai:{asap:'Dès que possible','6mois':'Dans les 6 mois',plus6mois:'Plus de 6 mois',nsp:'Ne sait pas',aucun:'Pas de projet'},
    etat:{travaux:'Travaux importants',rafraichir:'Quelques travaux',bon:'Bon état',neuf:'Refait à neuf'},
    epoque:{avant1948:'Avant 1948','1948-1974':'1948 – 1974','1975-2000':'1975 – 2000','2001-2012':'2001 – 2012',apres2012:'Après 2012',nsp:'Ne sait pas'},
    autre_type:{commerce:'Fonds de commerce',murs:'Murs commerciaux',immeuble:'Immeuble',terrain:'Terrain',autre:'Autre'},
    site:{shawez:'shawez-immo.com',gravelin:'gravelin-immo.com'}
  };
  function fiche(r){
    var L=[];
    function a(k,v){if(v!==''&&v!=null&&v!==false)L.push([k,v===true?'oui':String(v)]);}
    a('Type',r.type==='autre'?LIB.autre_type[r.autre_type]:r.type==='maison'?'Maison':'Appartement');
    a('Adresse',r.adresse); a('Surface',r.surface?r.surface+' m²':''); a('Pièces',r.pieces); a('Chambres',r.chambres);
    if(r.type==='appartement'){a('Étage',r.etage===0?'RDC':r.etage);a('Étages immeuble',r.etages_immeuble);}
    if(r.type==='maison'){a('Terrain',r.terrain!=null?r.terrain+' m²':'');a('Niveaux',r.niveaux);}
    a('Époque',LIB.epoque[r.epoque]); a('État',LIB.etat[r.etat]);
    a('Atouts',['ascenseur','balcon','terrasse','cave','gardien','parking','parking_box','plain_pied','piscine','garage'].filter(function(k){return r[k];}).map(function(k){return {parking_box:'garage/box',plain_pied:'plain-pied'}[k]||k;}).join(', '));
    a('Prix idéal',r.prix_ideal?EE.euros(r.prix_ideal):''); a('Délai',LIB.delai[r.delai]); a('Message',r.message);
    return L;
  }
  function lienFichier(f){return C.api+'/fichier?id='+encodeURIComponent(f.id);}
  function fichier(f){
    return '<li data-fid="'+EE.esc(f.id)+'"><a href="'+lienFichier(f)+'" target="_blank" rel="noopener"><i aria-hidden="true">'+(f.role==='avis'?'AVIS':f.type==='application/pdf'?'PDF':'IMG')+'</i><span><b>'+EE.esc(f.nom)+'</b><small>'+EE.taille(f.taille)+' · '+(f.role==='avis'?'avis de valeur':f.depose_par==='client'?'déposé par le client':'déposé par l\'agence')+' · '+EE.jour(f.cree_le)+'</small></span></a><button type="button" data-fsuppr="'+EE.esc(f.id)+'" aria-label="Retirer '+EE.esc(f.nom)+'">Retirer</button></li>';
  }
  function retard(d){ return d.rappel_le&&d.statut!=='avis'&&d.statut!=='close'&&d.rappel_le<=new Date().toISOString().slice(0,10); }
  function ligne(d){
    var c=d.contact||{}, nom=[c.civilite,c.prenom,c.nom].filter(Boolean).join(' ');
    var opts=Object.keys(STATUTS).map(function(k){return '<option value="'+k+'"'+(k===d.statut?' selected':'')+'>'+EE.esc(STATUTS[k])+'</option>';}).join('');
    var tel=String(c.telephone||'').replace(/[^\d+]/g,'');
    return '<details class="ee-row" data-id="'+d.id+'"><summary><b>'+EE.esc(nom||c.email)+' · '+EE.esc(d.commune||'')+'</b>'+
      '<span class="st '+d.statut+'">'+EE.esc(STATUTS[d.statut]||d.statut)+'</span>'+
      '<small>'+EE.date(d.cree_le)+' · '+EE.esc((d.type==='autre'?'Autre':d.type==='maison'?'Maison':'Appart.')+(d.surface?' '+d.surface+' m²':''))+' · '+(d.prix_bas?EE.euros(d.prix_bas)+' – '+EE.euros(d.prix_haut):'rappel')+' · '+EE.esc(LIB.site[d.site]||d.site||'')+
        (d.rappel_le?' · <span class="'+(retard(d)?'ee-late':'')+'">rappeler avant le '+EE.jour(d.rappel_le)+'</span>':'')+(d.suspect?' · <span class="ee-late">robot possible</span>':'')+(d.test?' · essai':'')+'</small></summary>'+
      '<div class="in"><div>'+
        '<div class="acts"><a class="btn btn-primary" href="tel:'+EE.esc(tel)+'">Appeler '+EE.esc(c.telephone||'')+'</a><a class="btn" href="mailto:'+EE.esc(c.email)+'?subject='+encodeURIComponent('Votre estimation '+d.reference)+'">E-mail</a>'+(tel?'<a class="btn" href="https://wa.me/'+EE.esc(tel.replace(/^\+/,'').replace(/^0/,'33'))+'" target="_blank" rel="noopener">WhatsApp</a>':'')+'</div>'+
        '<ul class="ee-kv" style="margin-top:14px;">'+[['Référence',d.reference],['Site',LIB.site[d.site]||d.site],['E-mail',c.email],['Fourchette',d.prix_bas?EE.euros(d.prix_bas)+' – '+EE.euros(d.prix_haut)+' ('+EE.euros(d.prix_m2)+'/m², '+d.comparables+' ventes'+(d.rayon?' à moins de '+EE.rayon(d.rayon):'')+')':'Pas de fourchette : rappel promis sous 24 h']].concat(fiche(d.reponses||{})).concat(d.en_attente?[['Espace client','en attente de confirmation de l\'e-mail']]:[]).map(function(l){return '<li><span>'+EE.esc(l[0])+'</span><span>'+EE.esc(l[1])+'</span></li>';}).join('')+'</ul>'+
      '</div><div class="ee-col">'+
        '<div class="field"><label for="ad-st-'+d.id+'">Statut</label><select id="ad-st-'+d.id+'" data-f="statut">'+opts+'</select></div>'+
        '<div class="field"><label for="ad-rp-'+d.id+'">Rappeler avant le</label><input type="date" id="ad-rp-'+d.id+'" data-f="rappel_le" value="'+EE.esc(d.rappel_le||'')+'"></div>'+
        '<div class="field"><label for="ad-no-'+d.id+'">Notes (visibles par l\'agence seulement)</label><textarea id="ad-no-'+d.id+'" data-f="notes" maxlength="5000">'+EE.esc(d.notes||'')+'</textarea></div>'+
        '<div class="acts"><button type="button" class="btn btn-primary" data-save>Enregistrer</button><span class="saved" role="status" hidden>Enregistré</span></div>'+
        '<div class="ee-files"><p class="lab">Avis de valeur et fichiers</p><ul class="ee-flist">'+(d.fichiers||[]).map(fichier).join('')+'</ul>'+
          '<div class="acts"><label class="btn ee-add"><input type="file" accept="application/pdf" data-depot="avis">Déposer l\'avis de valeur (PDF)</label><label class="btn ee-add"><input type="file" multiple accept="image/jpeg,image/png,image/webp,image/heic,image/heif,application/pdf" data-depot="document">Ajouter un document</label></div>'+
          '<p class="hint">Le client voit l\'avis de valeur et les documents dans son espace. 10 Mo au plus par fichier.</p><p class="ee-err" role="alert" hidden></p><p class="ee-ok" role="status" hidden></p></div>'+
        '<div class="ee-links">'+(d.suspect?'<button type="button" data-humain>Ce n\'est pas un robot</button>':'')+'<button type="button" class="ee-danger" data-dsuppr>Supprimer cette demande</button></div>'+
      '</div></div></details>';
  }
  function filtres(){ return {q:$('#ad-q').value.trim().toLowerCase(),s:$('#ad-statut').value,site:$('#ad-site').value}; }
  function filtrer(){
    var f=filtres();
    var ouvertes=$$('#ad-rows details[open]').map(function(x){return x.getAttribute('data-id');});
    var l=D.filter(function(d){ if(f.s&&d.statut!==f.s)return false; if(f.site&&d.site!==f.site)return false; if(!f.q)return true; var c=d.contact||{}; return [c.prenom,c.nom,c.email,c.telephone,String(c.telephone||'').replace(/\D/g,''),d.commune,d.adresse,d.reference,d.site].join(' ').toLowerCase().indexOf(f.q)>=0; });
    $('#ad-rows').innerHTML=l.length?l.map(ligne).join(''):'<div class="ee-empty">Aucune demande.</div>';
    ouvertes.forEach(function(id){var x=$('#ad-rows details[data-id="'+id+'"]');if(x)x.open=true;});
    if(l.length===1)$('#ad-rows details').open=true;
    $('#ad-export').href=C.api+'/admin/export.csv?quoi=demandes'+(f.site?'&site='+f.site:'')+(f.s?'&statut='+f.s:'');
  }
  function stats(){
    var n=function(s){return D.filter(function(d){return d.statut===s;}).length;};
    $('#ad-stats').innerHTML=[['Demandes',D.length],['Nouvelles',n('recue')],['À rappeler',D.filter(retard).length],['Visites prévues',n('visite')]].map(function(x){return '<div class="ee-stat"><b>'+x[1]+'</b><span>'+x[0]+'</span></div>';}).join('');
  }
  function comptes(){
    var q=$('#ad-qc').value.trim().toLowerCase();
    var l=Cp.filter(function(c){return !q||[c.prenom,c.nom,c.email,c.telephone].join(' ').toLowerCase().indexOf(q)>=0;});
    $('#ad-crows').innerHTML=l.length?l.map(function(c){
      return '<details class="ee-row" data-cid="'+c.id+'"><summary><b>'+EE.esc([c.civilite,c.prenom,c.nom].filter(Boolean).join(' ')||c.email)+'</b><span class="st">'+c.demandes+' est.</span><small>'+EE.esc(c.email)+' · '+EE.esc(c.telephone||'')+' · créé le '+EE.date(c.cree_le)+(c.admin?' · admin':'')+'</small></summary>'+
        '<div class="in"><ul class="ee-kv">'+[['E-mail',c.email+(c.verifie?' (confirmé)':' (non confirmé)')],['Téléphone',c.telephone||'—'],['Mot de passe',c.mot_de_passe?'défini':'aucun (connexion par lien)'],['Site',LIB.site[c.site]||c.site||'—'],['Dernière connexion',c.derniere_connexion?EE.date(c.derniere_connexion):'—']].map(function(x){return '<li><span>'+x[0]+'</span><span>'+EE.esc(x[1])+'</span></li>';}).join('')+'</ul>'+
        '<div><div class="acts">'+(c.telephone?'<a class="btn btn-primary" href="tel:'+EE.esc(c.telephone.replace(/[^\d+]/g,''))+'">Appeler</a>':'')+'<button type="button" class="btn" data-lien="acces">Lien de connexion</button><button type="button" class="btn" data-lien="reinit">Lien nouveau mot de passe</button>'+(c.admin?'':'<button type="button" class="btn" data-del="'+c.id+'">Supprimer ce compte</button>')+'</div><p class="ee-ok" data-lien-out role="status" hidden style="margin-top:12px;"></p></div></div></details>';
    }).join(''):'<div class="ee-empty">Aucun compte.</div>';
  }
  function charger(){
    return Promise.all([EE.api('/admin/demandes'),EE.api('/admin/comptes')]).then(function(r){
      $('#ad-load').hidden=true;
      if(r[0]._status!==200){
        $('#ad-no').hidden=false; $('#ad-in').hidden=true;
        if(r[0].error==='admin_non_verifie')$('#ad-no-txt').textContent='Votre adresse doit être confirmée avant d\'ouvrir l\'espace agence : connectez-vous par le lien reçu par e-mail (Mon espace → « Recevoir mon lien de connexion »).';
        else if(r[0].error==='interdit')$('#ad-no-txt').textContent='Ce compte n\'a pas accès à l\'espace agence.';
        else if(r[0]._status!==401&&r[0]._status!==403)$('#ad-no-txt').textContent=EE.message(r[0]);
        return;
      }
      STATUTS=r[0].statuts; D=r[0].demandes; Cp=r[1].comptes||[]; if(r[0].taille_max)TAILLE_MAX=r[0].taille_max;
      var s=$('#ad-statut'), v=s.value;
      s.innerHTML='<option value="">Tous les statuts</option>'+Object.keys(STATUTS).map(function(k){return '<option value="'+k+'">'+EE.esc(STATUTS[k])+'</option>';}).join(''); s.value=v;
      $('#ad-in').hidden=false; stats(); filtrer(); comptes();
    });
  }
  $('#ad-q').addEventListener('input',filtrer); $('#ad-statut').addEventListener('change',filtrer); $('#ad-site').addEventListener('change',filtrer); $('#ad-qc').addEventListener('input',comptes);
  $$('[data-vue]').forEach(function(b){b.addEventListener('click',function(){var v=b.getAttribute('data-vue');['demandes','comptes','reglages'].forEach(function(k){$('#ad-'+k).hidden=v!==k;});$$('[data-vue]').forEach(function(x){x.setAttribute('aria-pressed',String(x===b));});});});

  function note(row,t,ko){var s=$('.saved',row);s.hidden=false;s.style.color=ko?'#7E2C1F':'';s.textContent=t;if(!ko)setTimeout(function(){s.hidden=true;},2500);}
  function zoneMsg(zone,txt,ok){var e=$(ok?'.ee-ok':'.ee-err',zone),a=$(ok?'.ee-err':'.ee-ok',zone);a.hidden=true;e.textContent=txt||'';e.hidden=!txt;}
  function demande(id){return D.filter(function(k){return k.id===id;})[0];}
  $('#ad-rows').addEventListener('click',function(e){
    var row=e.target.closest('.ee-row'); if(!row)return; var id=+row.getAttribute('data-id'), x=demande(id);
    var b=e.target.closest('[data-save]');
    if(b){
      var corps={id:id,statut:$('[data-f=statut]',row).value,notes:$('[data-f=notes]',row).value,rappel_le:$('[data-f=rappel_le]',row).value};
      b.disabled=true;
      EE.api('/admin/demande',{body:corps}).then(function(d){
        b.disabled=false;
        if(d._status!==200){note(row,EE.messageChamp(d),true);return;}
        if(x){x.statut=corps.statut;x.notes=corps.notes;x.rappel_le=corps.rappel_le;}
        note(row,'Enregistré');
        var st=$('summary .st',row); st.className='st '+corps.statut; st.textContent=STATUTS[corps.statut]; stats();
      });
      return;
    }
    var h=e.target.closest('[data-humain]');
    if(h){ EE.api('/admin/demande',{body:{id:id,suspect:false}}).then(function(d){ if(d._status===200){if(x)x.suspect=false;filtrer();} }); return; }
    var ds=e.target.closest('[data-dsuppr]');
    if(ds){
      if(ds.getAttribute('data-ok')!=='1'){ds.setAttribute('data-ok','1');ds.textContent='Confirmer : demande et fichiers effacés';return;}
      EE.api('/admin/demande/supprimer',{body:{id:id}}).then(function(d){ if(d._status===200){D=D.filter(function(k){return k.id!==id;});stats();filtrer();} else ds.textContent=EE.message(d); });
      return;
    }
    var fs=e.target.closest('[data-fsuppr]');
    if(fs){
      if(fs.getAttribute('data-ok')!=='1'){fs.setAttribute('data-ok','1');fs.textContent='Confirmer';return;}
      var fid=fs.getAttribute('data-fsuppr');
      EE.api('/fichier/supprimer',{body:{id:fid}}).then(function(d){ if(d._status===200){ if(x)x.fichiers=(x.fichiers||[]).filter(function(f){return f.id!==fid;}); var li=fs.closest('li'); li.parentNode.removeChild(li);} else fs.textContent=EE.message(d); });
    }
  });
  /* dépôt de l'avis de valeur (PDF) ou d'un document */
  $('#ad-rows').addEventListener('change',function(e){
    var input=e.target.closest('[data-depot]'); if(!input||!input.files||!input.files.length)return;
    var row=input.closest('.ee-row'), id=+row.getAttribute('data-id'), x=demande(id), zone=$('.ee-files',row), liste=$('.ee-flist',row), role=input.getAttribute('data-depot');
    var fichiers=Array.prototype.slice.call(input.files), n=0, erreurs=[];
    input.disabled=true; input.parentNode.classList.add('busy'); zoneMsg(zone,'');
    function suite(){
      if(n>=fichiers.length){
        input.disabled=false; input.value=''; input.parentNode.classList.remove('busy');
        if(erreurs.length)zoneMsg(zone,erreurs.join(' '));
        else zoneMsg(zone,role==='avis'?'Avis de valeur déposé : le client peut le télécharger dans son espace.':'Fichier ajouté.',true);
        return;
      }
      var f=fichiers[n++];
      if(f.size>TAILLE_MAX){erreurs.push(f.name+' : plus de 10 Mo.');return suite();}
      zoneMsg(zone,'Envoi '+n+' sur '+fichiers.length+'…',true);
      EE.api('/admin/fichier?demande='+id+'&role='+role,{fichier:f,nom:f.name,delai:120000}).then(function(d){
        if(d._status===201){
          liste.insertAdjacentHTML('beforeend',fichier(d.fichier)); if(x){(x.fichiers=x.fichiers||[]).push(d.fichier);}
          if(d.statut&&x&&x.statut!==d.statut){x.statut=d.statut;$('[data-f=statut]',row).value=d.statut;var st=$('summary .st',row);st.className='st '+d.statut;st.textContent=STATUTS[d.statut];stats();}
        } else erreurs.push(f.name+' : '+EE.message(d));
        suite();
      });
    }
    suite();
  });
  $('#ad-crows').addEventListener('click',function(e){
    var l=e.target.closest('[data-lien]');
    if(l){
      var row=l.closest('.ee-row'), id=+row.getAttribute('data-cid'), out=$('[data-lien-out]',row), c=Cp.filter(function(x){return x.id===id;})[0]||{}, type=l.getAttribute('data-lien');
      EE.api('/admin/compte/lien',{body:{id:id,type:type}}).then(function(d){
        out.hidden=false;
        if(d._status!==200){out.className='ee-err';out.textContent=EE.message(d);return;}
        var txt='Bonjour '+(c.prenom||'')+', voici le lien pour '+(type==='reinit'?'choisir un nouveau mot de passe pour votre espace':'ouvrir votre espace et retrouver votre estimation')+' (valable 24 h, une seule fois) : '+d.lien;
        out.className='ee-ok';
        out.innerHTML=(type==='reinit'?'Lien « nouveau mot de passe »':'Lien de connexion')+', valable 24 h, à transmettre au client :<br><span style="word-break:break-all;" data-test="lien">'+EE.esc(d.lien)+'</span><br>'+
          (c.telephone?'<a href="https://wa.me/'+EE.esc(String(c.telephone).replace(/\D/g,'').replace(/^0/,'33'))+'?text='+encodeURIComponent(txt)+'" target="_blank" rel="noopener">Envoyer par WhatsApp</a> · <a href="sms:'+EE.esc(String(c.telephone).replace(/[^\d+]/g,''))+'?&body='+encodeURIComponent(txt)+'">par SMS</a> · ':'')+
          '<a href="mailto:'+EE.esc(c.email)+'?subject='+encodeURIComponent('Votre espace estimation')+'&body='+encodeURIComponent(txt)+'">par e-mail</a>';
      });
      return;
    }
    var b=e.target.closest('[data-del]'); if(!b)return;
    if(b.getAttribute('data-ok')!=='1'){b.setAttribute('data-ok','1');b.textContent='Confirmer : compte et estimations effacés';return;}
    EE.api('/admin/compte/supprimer',{body:{id:+b.getAttribute('data-del')}}).then(function(d){ if(d._status===200)charger(); else b.textContent=EE.message(d); });
  });
  $('#ad-flux').addEventListener('click',function(){
    var b=this, out=$('#ad-flux-out');
    if(b.getAttribute('data-ok')!=='1'){b.setAttribute('data-ok','1');b.textContent='Confirmer : l\'ancienne clé ne marchera plus';return;}
    EE.api('/admin/flux',{body:{}}).then(function(d){
      out.hidden=false; b.removeAttribute('data-ok'); b.textContent='Créer une nouvelle clé';
      if(d._status!==200){out.className='ee-err';out.textContent=EE.message(d);return;}
      out.className='ee-ok'; out.innerHTML='Nouvelle clé créée. Collez cette formule dans la cellule A1 de l\'onglet « Site » (elle ne sera plus affichée) :<br><span style="word-break:break-all;" data-test="formule">'+EE.esc(d.formule)+'</span>';
    });
  });
  /* arrivée depuis l'e-mail d'alerte : /admin/?q=<référence> */
  var q0=new URLSearchParams(location.search).get('q'); if(q0)$('#ad-q').value=q0;
  charger();
})();

  }
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',demarrer); else demarrer();
})();
