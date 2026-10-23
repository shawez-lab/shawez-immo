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

var FRAGMENTS={"estimer":"<section class=\"route ee\" data-route=\"/estimer\" id=\"r-estimer\">\n  <div class=\"page-head shell\">\n    <p class=\"label\">Estimation offerte · 2 minutes<\/p>\n    <h1 class=\"display d-xl\" style=\"margin-top:14px;\">Combien vaut votre bien <em>aujourd'hui ?<\/em><\/h1>\n    <p class=\"lede\">6 étapes, 2 minutes : votre fourchette de prix s'affiche tout de suite, calculée sur les ventes signées autour de chez vous. Ensuite, si vous le voulez, une estimation précise chez vous, offerte et sans engagement.<\/p>\n    <p class=\"ee-remise\">Vos coordonnées vous sont demandées à la dernière étape : la fourchette s'affiche alors aussitôt à l'écran, et elle reste rangée dans un espace personnel ouvert avec votre e-mail, sans mot de passe à créer.<\/p>\n    <!-- avis:estimer-haut --><!-- /avis:estimer-haut -->\n  <\/div>\n  <div class=\"shell\">\n    <form class=\"form ee-wrap\" id=\"ee-form\" novalidate autocomplete=\"on\">\n      <div class=\"hp\" aria-hidden=\"true\"><label for=\"ee-hp\">Ne rien écrire ici<\/label><input type=\"text\" id=\"ee-hp\" name=\"ee_hp_k7\" tabindex=\"-1\" autocomplete=\"off\" data-lpignore=\"true\" data-1p-ignore data-form-type=\"other\"><\/div>\n      <ol class=\"ee-steps\" id=\"ee-steps\" aria-label=\"Étapes de l'estimation\">\n        <li><span><b>1<\/b>Adresse<\/span><\/li><li><span><b>2<\/b>Type<\/span><\/li><li><span><b>3<\/b>Le bien<\/span><\/li><li><span><b>4<\/b>Atouts<\/span><\/li><li><span><b>5<\/b>Prix<\/span><\/li><li><span><b>6<\/b>Projet<\/span><\/li>\n      <\/ol>\n\n      <!-- 1 ADRESSE -->\n      <div class=\"ee-step\" data-s=\"adresse\" tabindex=\"-1\">\n        <div class=\"ee-head\"><p class=\"ee-count\">Étape 1 sur 6<\/p><h2 class=\"ee-q\">Où se trouve <em>votre bien ?<\/em><\/h2><p class=\"ee-sub\">Le numéro et la rue suffisent : on compare avec les ventes signées dans votre rue et votre quartier.<\/p><\/div>\n        <div class=\"field ee-addr\">\n          <label for=\"ee-adresse\">Adresse du bien<\/label>\n          <div style=\"position:relative;\">\n            <svg class=\"pin\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.8\" aria-hidden=\"true\"><path d=\"M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21Z\"/><circle cx=\"12\" cy=\"9.5\" r=\"2.5\"/><\/svg>\n            <input type=\"text\" id=\"ee-adresse\" name=\"adresse\" placeholder=\"ex. 30 rue Bannelier, Dijon\" autocomplete=\"street-address\" role=\"combobox\" aria-autocomplete=\"list\" aria-expanded=\"false\" aria-controls=\"ee-sugg\" aria-describedby=\"ee-adresse-msg\" spellcheck=\"false\" enterkeyhint=\"search\">\n          <\/div>\n          <ul class=\"ee-sugg\" id=\"ee-sugg\" role=\"listbox\" aria-label=\"Adresses proposées\" hidden><\/ul>\n          <span class=\"msg\" id=\"ee-adresse-msg\">Choisissez votre adresse dans la liste.<\/span>\n        <\/div>\n        <p class=\"ee-picked\" id=\"ee-picked\" hidden><svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" aria-hidden=\"true\"><path d=\"M5 12.5l4.5 4.5L19 7.5\"/><\/svg><span><\/span><\/p>\n        <div class=\"ee-nav\"><span><\/span><button type=\"button\" class=\"btn btn-primary btn-lg\" data-next>Étape suivante <span class=\"arw\">→<\/span><\/button><\/div>\n      <\/div>\n\n      <!-- 2 TYPE -->\n      <div class=\"ee-step\" data-s=\"type\" tabindex=\"-1\" hidden>\n        <div class=\"ee-head\"><p class=\"ee-count\">Étape 2 sur 6<\/p><h2 class=\"ee-q\">Votre bien est <em>plutôt…<\/em><\/h2><\/div>\n        <div class=\"ee-tiles\" role=\"group\" aria-label=\"Type de bien\">\n          <button type=\"button\" class=\"ee-tile\" data-type=\"appartement\" aria-pressed=\"false\"><svg viewBox=\"0 0 48 48\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.6\" aria-hidden=\"true\"><path d=\"M10 42V8h22v34M32 18h8v24M6 42h38\"/><path d=\"M15 14h3M24 14h3M15 21h3M24 21h3M15 28h3M24 28h3M19 42v-7h6v7\"/><\/svg>Un appartement<\/button>\n          <button type=\"button\" class=\"ee-tile\" data-type=\"maison\" aria-pressed=\"false\"><svg viewBox=\"0 0 48 48\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.6\" aria-hidden=\"true\"><path d=\"M6 22 24 8l18 14M11 18v24h26V18M6 42h36\"/><path d=\"M20 42V31h8v11M15 25h4M29 25h4\"/><\/svg>Une maison<\/button>\n        <\/div>\n        <p class=\"ee-more\">Un commerce, des murs, un immeuble, un terrain ? <button type=\"button\" id=\"ee-autre-btn\" aria-expanded=\"false\">C'est par ici<\/button><\/p>\n        <div class=\"field\" id=\"ee-autre\" hidden>\n          <span class=\"lab\">Votre bien<\/span>\n          <div class=\"pills\" role=\"group\" aria-label=\"Autre type de bien\">\n            <button type=\"button\" class=\"pill\" data-autre=\"commerce\">Fonds de commerce<\/button><button type=\"button\" class=\"pill\" data-autre=\"murs\">Murs commerciaux<\/button><button type=\"button\" class=\"pill\" data-autre=\"immeuble\">Immeuble<\/button><button type=\"button\" class=\"pill\" data-autre=\"terrain\">Terrain<\/button><button type=\"button\" class=\"pill\" data-autre=\"autre\">Autre<\/button>\n          <\/div>\n          <p class=\"note\">Pour ces biens, pas de fourchette en ligne : Shawez étudie le vôtre lui-même et vous rappelle au plus vite.<\/p>\n        <\/div>\n        <span class=\"msg\" id=\"ee-type-msg\" hidden>Choisissez un type de bien.<\/span>\n        <div class=\"ee-nav\"><button type=\"button\" class=\"btn\" data-prev>Retour<\/button><button type=\"button\" class=\"btn btn-primary btn-lg\" data-next>Étape suivante <span class=\"arw\">→<\/span><\/button><\/div>\n      <\/div>\n\n      <!-- 3 LE BIEN -->\n      <div class=\"ee-step\" data-s=\"bien\" tabindex=\"-1\" hidden>\n        <div class=\"ee-head\"><p class=\"ee-count\">Étape 3 sur 6<\/p><h2 class=\"ee-q\">Décrivez-le <em>en quelques clics.<\/em><\/h2><\/div>\n        <div class=\"field\">\n          <label for=\"ee-surface\" id=\"ee-surface-lab\">Surface habitable<\/label>\n          <div class=\"ee-unit\"><input type=\"number\" id=\"ee-surface\" inputmode=\"numeric\" min=\"5\" max=\"2000\" placeholder=\"ex. 72\"><i>m²<\/i><\/div>\n          <span class=\"hint\" id=\"ee-surface-hint\">Surface loi Carrez si vous l'avez, sinon une surface approximative.<\/span>\n          <span class=\"msg\">Indiquez une surface entre 5 et 2 000 m².<\/span>\n        <\/div>\n        <div class=\"ee-stps\" data-pour=\"appartement maison\">\n          <div class=\"ee-stp\" data-k=\"etage\" data-min=\"0\" data-max=\"40\" data-v=\"\" data-pour=\"appartement\"><div class=\"l\">Étage du bien<small>0 = rez-de-chaussée<\/small><\/div><div class=\"c\"><button type=\"button\" data-d=\"-1\" aria-label=\"Moins\">−<\/button><output aria-live=\"polite\">–<\/output><button type=\"button\" data-d=\"1\" aria-label=\"Plus\">+<\/button><\/div><span class=\"msg\">Choisissez l'étage du bien.<\/span><\/div>\n          <div class=\"ee-stp\" data-k=\"etages_immeuble\" data-min=\"0\" data-max=\"40\" data-v=\"\" data-pour=\"appartement\"><div class=\"l\">Étages de l'immeuble<small>Sans compter le rez-de-chaussée<\/small><\/div><div class=\"c\"><button type=\"button\" data-d=\"-1\" aria-label=\"Moins\">−<\/button><output aria-live=\"polite\">–<\/output><button type=\"button\" data-d=\"1\" aria-label=\"Plus\">+<\/button><\/div><span class=\"msg\">Indiquez le nombre d'étages de l'immeuble.<\/span><\/div>\n          <div class=\"ee-stp\" data-k=\"niveaux\" data-min=\"1\" data-max=\"6\" data-v=\"\" data-pour=\"maison\"><div class=\"l\">Niveaux habitables<small>1 = plain-pied<\/small><\/div><div class=\"c\"><button type=\"button\" data-d=\"-1\" aria-label=\"Moins\">−<\/button><output aria-live=\"polite\">–<\/output><button type=\"button\" data-d=\"1\" aria-label=\"Plus\">+<\/button><\/div><span class=\"msg\">Indiquez le nombre de niveaux.<\/span><\/div>\n          <div class=\"ee-stp\" data-k=\"pieces\" data-min=\"1\" data-max=\"20\" data-v=\"\"><div class=\"l\">Pièces<small>Sans la cuisine ni les salles d'eau<\/small><\/div><div class=\"c\"><button type=\"button\" data-d=\"-1\" aria-label=\"Moins\">−<\/button><output aria-live=\"polite\">–<\/output><button type=\"button\" data-d=\"1\" aria-label=\"Plus\">+<\/button><\/div><span class=\"msg\">Indiquez le nombre de pièces.<\/span><\/div>\n          <div class=\"ee-stp\" data-k=\"chambres\" data-min=\"0\" data-max=\"15\" data-v=\"\"><div class=\"l\">Chambres<\/div><div class=\"c\"><button type=\"button\" data-d=\"-1\" aria-label=\"Moins\">−<\/button><output aria-live=\"polite\">–<\/output><button type=\"button\" data-d=\"1\" aria-label=\"Plus\">+<\/button><\/div><span class=\"msg\">Indiquez le nombre de chambres.<\/span><\/div>\n        <\/div>\n        <div class=\"field\" data-pour=\"maison\">\n          <label for=\"ee-terrain\">Surface du terrain<\/label>\n          <div class=\"ee-unit\"><input type=\"number\" id=\"ee-terrain\" inputmode=\"numeric\" min=\"0\" max=\"1000000\" placeholder=\"ex. 600\"><i>m²<\/i><\/div>\n          <span class=\"hint\">0 s'il n'y a pas de terrain.<\/span>\n          <span class=\"msg\">Indiquez la surface du terrain (0 s'il n'y en a pas).<\/span>\n        <\/div>\n        <div class=\"field\" data-pour=\"appartement maison\">\n          <span class=\"lab\">Époque de construction<\/span>\n          <div class=\"ee-grid2\" data-choix=\"epoque\" role=\"group\" aria-label=\"Époque de construction\">\n            <button type=\"button\" class=\"ee-opt\" data-v=\"avant1948\">Avant 1948<\/button><button type=\"button\" class=\"ee-opt\" data-v=\"1948-1974\">1948 – 1974<\/button><button type=\"button\" class=\"ee-opt\" data-v=\"1975-2000\">1975 – 2000<\/button><button type=\"button\" class=\"ee-opt\" data-v=\"2001-2012\">2001 – 2012<\/button><button type=\"button\" class=\"ee-opt\" data-v=\"apres2012\">Après 2012<\/button><button type=\"button\" class=\"ee-opt\" data-v=\"nsp\">Je ne sais pas<\/button>\n          <\/div>\n          <span class=\"msg\">Choisissez une époque (ou « Je ne sais pas »).<\/span>\n        <\/div>\n        <div class=\"field\" data-pour=\"appartement maison\">\n          <span class=\"lab\">État général<\/span>\n          <div class=\"ee-list\" data-choix=\"etat\" role=\"group\" aria-label=\"État général\">\n            <button type=\"button\" class=\"ee-opt\" data-v=\"travaux\"><span>Travaux importants<small>Électricité, plomberie, toiture ou rénovation complète<\/small><\/span><\/button>\n            <button type=\"button\" class=\"ee-opt\" data-v=\"rafraichir\"><span>Quelques travaux<small>Peintures, sols, cuisine à reprendre<\/small><\/span><\/button>\n            <button type=\"button\" class=\"ee-opt\" data-v=\"bon\"><span>Bon état<small>On peut y habiter tel quel<\/small><\/span><\/button>\n            <button type=\"button\" class=\"ee-opt\" data-v=\"neuf\"><span>Refait à neuf<small>Rénové il y a moins de 5 ans, ou neuf<\/small><\/span><\/button>\n          <\/div>\n          <span class=\"msg\">Choisissez l'état général.<\/span>\n        <\/div>\n        <div class=\"field\" data-pour=\"autre\">\n          <label for=\"ee-message\">En quelques mots<\/label>\n          <textarea id=\"ee-message\" maxlength=\"1500\" placeholder=\"Activité, chiffre d'affaires, loyer, nombre de lots… ce qui vous semble utile.\"><\/textarea>\n        <\/div>\n        <div class=\"ee-nav\"><button type=\"button\" class=\"btn\" data-prev>Retour<\/button><button type=\"button\" class=\"btn btn-primary btn-lg\" data-next>Étape suivante <span class=\"arw\">→<\/span><\/button><\/div>\n      <\/div>\n\n      <!-- 4 ATOUTS -->\n      <div class=\"ee-step\" data-s=\"atouts\" tabindex=\"-1\" hidden>\n        <div class=\"ee-head\"><p class=\"ee-count\">Étape 4 sur 6<\/p><h2 class=\"ee-q\">Ses atouts <em>comptent dans le prix.<\/em><\/h2><p class=\"ee-sub\">Cochez tout ce que votre bien possède.<\/p><\/div>\n        <div class=\"ee-checks\">\n          <label class=\"ee-check\" data-pour=\"appartement\"><input type=\"checkbox\" name=\"ascenseur\"><i><\/i>Ascenseur<\/label>\n          <label class=\"ee-check\" data-pour=\"appartement\"><input type=\"checkbox\" name=\"balcon\"><i><\/i>Balcon<\/label>\n          <label class=\"ee-check\"><input type=\"checkbox\" name=\"terrasse\"><i><\/i>Terrasse<\/label>\n          <label class=\"ee-check\" data-pour=\"appartement\"><input type=\"checkbox\" name=\"cave\"><i><\/i>Cave<\/label>\n          <label class=\"ee-check\" data-pour=\"appartement\"><input type=\"checkbox\" name=\"gardien\"><i><\/i>Gardien<\/label>\n          <label class=\"ee-check\" data-pour=\"appartement\"><input type=\"checkbox\" name=\"parking\"><i><\/i>Place de parking<\/label>\n          <label class=\"ee-check\" data-pour=\"appartement\"><input type=\"checkbox\" name=\"parking_box\"><i><\/i>Garage ou box<\/label>\n          <label class=\"ee-check\" data-pour=\"maison\"><input type=\"checkbox\" name=\"plain_pied\"><i><\/i>Plain-pied<\/label>\n          <label class=\"ee-check\" data-pour=\"maison\"><input type=\"checkbox\" name=\"piscine\"><i><\/i>Piscine<\/label>\n          <label class=\"ee-check\" data-pour=\"maison\"><input type=\"checkbox\" name=\"garage\"><i><\/i>Garage<\/label>\n        <\/div>\n        <div class=\"ee-nav\"><button type=\"button\" class=\"btn\" data-prev>Retour<\/button><button type=\"button\" class=\"btn btn-primary btn-lg\" data-next>Étape suivante <span class=\"arw\">→<\/span><\/button><\/div>\n      <\/div>\n\n      <!-- 5 PRIX -->\n      <div class=\"ee-step\" data-s=\"prix\" tabindex=\"-1\" hidden>\n        <div class=\"ee-head\"><p class=\"ee-count\">Étape 5 sur 6<\/p><h2 class=\"ee-q\">Et vous, vous l'imaginez <em>à combien ?<\/em><\/h2><p class=\"ee-sub\">Facultatif. Votre réponse ne change pas le calcul : elle aide Shawez à comprendre ce que vous attendez.<\/p><\/div>\n        <div class=\"field\">\n          <label for=\"ee-prix\">Prix de vente idéal<\/label>\n          <div class=\"ee-unit\"><input type=\"text\" id=\"ee-prix\" inputmode=\"numeric\" placeholder=\"ex. 250 000\" autocomplete=\"off\"><i>€<\/i><\/div>\n          <span class=\"msg\">Indiquez un montant en euros, ou laissez vide.<\/span>\n        <\/div>\n        <div class=\"ee-nav\"><button type=\"button\" class=\"btn\" data-prev>Retour<\/button><button type=\"button\" class=\"btn btn-primary btn-lg\" data-next>Étape suivante <span class=\"arw\">→<\/span><\/button><\/div>\n      <\/div>\n\n      <!-- 6 PROJET -->\n      <div class=\"ee-step\" data-s=\"projet\" tabindex=\"-1\" hidden>\n        <div class=\"ee-head\"><p class=\"ee-count\">Étape 6 sur 6<\/p><h2 class=\"ee-q\">Vous pensez vendre <em>quand ?<\/em><\/h2><\/div>\n        <div class=\"field\">\n          <div class=\"ee-list\" data-choix=\"delai\" role=\"group\" aria-label=\"Délai de vente\">\n            <button type=\"button\" class=\"ee-opt\" data-v=\"asap\">Dès que possible<\/button>\n            <button type=\"button\" class=\"ee-opt\" data-v=\"6mois\">Dans les 6 mois<\/button>\n            <button type=\"button\" class=\"ee-opt\" data-v=\"plus6mois\">Dans plus de 6 mois<\/button>\n            <button type=\"button\" class=\"ee-opt\" data-v=\"nsp\">Je ne sais pas encore<\/button>\n            <button type=\"button\" class=\"ee-opt\" data-v=\"aucun\">Pas de projet, je me renseigne<\/button>\n          <\/div>\n          <span class=\"msg\">Choisissez une réponse.<\/span>\n        <\/div>\n        <div class=\"ee-nav\"><button type=\"button\" class=\"btn\" data-prev>Retour<\/button><button type=\"button\" class=\"btn btn-primary btn-lg\" data-next>Voir mon estimation <span class=\"arw\">→<\/span><\/button><\/div>\n      <\/div>\n\n      <!-- COORDONNÉES : un seul écran, pas de mot de passe -->\n      <div class=\"ee-step\" data-s=\"contact\" tabindex=\"-1\" hidden>\n        <div class=\"ee-head\"><p class=\"label\">C'est prêt<\/p><h2 class=\"ee-q\">Votre estimation est <em>prête.<\/em><\/h2><p class=\"ee-sub\" id=\"ee-contact-sub\">Plus qu'une étape : dites-nous qui vous êtes, votre estimation s'affiche aussitôt.<\/p><\/div>\n        <!-- avis:estimer-form --><!-- /avis:estimer-form -->\n        <div id=\"ee-logged\" class=\"ee-who\" hidden><img data-ee-portrait alt=\"\" width=\"52\" height=\"52\" loading=\"lazy\" hidden><p><\/p><\/div>\n        <div id=\"ee-new\">\n          <div class=\"field\"><span class=\"lab\" id=\"ee-civ-lab\">Civilité<\/span><div class=\"ee-civ\" role=\"group\" aria-labelledby=\"ee-civ-lab\"><button type=\"button\" class=\"pill\" data-civ=\"Mme\">Madame<\/button><button type=\"button\" class=\"pill\" data-civ=\"M.\">Monsieur<\/button><\/div><\/div>\n          <div class=\"row2\" style=\"margin-top:18px;\">\n            <div class=\"field\"><label for=\"ee-prenom\">Prénom<\/label><input type=\"text\" id=\"ee-prenom\" autocomplete=\"given-name\" maxlength=\"80\" autocapitalize=\"words\"><span class=\"msg\">Indiquez votre prénom.<\/span><\/div>\n            <div class=\"field\"><label for=\"ee-nom\">Nom<\/label><input type=\"text\" id=\"ee-nom\" autocomplete=\"family-name\" maxlength=\"80\" autocapitalize=\"words\"><span class=\"msg\">Indiquez votre nom.<\/span><\/div>\n          <\/div>\n          <div class=\"field\" style=\"margin-top:18px;\"><label for=\"ee-email\">E-mail<\/label><input type=\"email\" id=\"ee-email\" autocomplete=\"email\" inputmode=\"email\" maxlength=\"160\" autocapitalize=\"off\" autocorrect=\"off\" spellcheck=\"false\"><span class=\"msg\">Indiquez une adresse e-mail valide (ex. prenom@exemple.fr).<\/span><\/div>\n        <\/div>\n        <div class=\"field\"><label for=\"ee-tel\">Téléphone<\/label><input type=\"tel\" id=\"ee-tel\" autocomplete=\"tel\" inputmode=\"tel\" maxlength=\"30\" placeholder=\"06 12 34 56 78\"><span class=\"msg\">Indiquez un numéro de téléphone valide (ex. 06 12 34 56 78).<\/span><\/div>\n        <div class=\"field\" id=\"ee-consent-f\"><label class=\"consent\"><input type=\"checkbox\" id=\"ee-consent\"><span>J'accepte que GRAVELIN IMMO utilise ces informations pour calculer mon estimation, créer mon espace personnel et me recontacter à ce sujet. <a href=\"/politique-de-confidentialite/#espace-estimation\" data-ee-lien=\"confidentialite\">Confidentialité<\/a><\/span><\/label><span class=\"msg\">Cochez la case pour continuer.<\/span><\/div>\n        <p class=\"ee-err\" id=\"ee-err\" role=\"alert\" hidden><\/p>\n        <div class=\"ee-nav ee-nav-fin\"><button type=\"button\" class=\"btn\" data-prev>Retour<\/button><button type=\"submit\" class=\"btn btn-primary btn-lg\" id=\"ee-submit\"><span id=\"ee-submit-txt\">Connaître le prix de mon bien<\/span> <span class=\"arw\">→<\/span><\/button><\/div>\n        <p class=\"ee-fine\">Pas de mot de passe à créer : votre espace s'ouvre avec votre e-mail. Aucun démarchage : seul <span data-ee-txt=\"conseiller\">Shawez<\/span> vous recontacte, et seulement pour ce bien.<\/p>\n      <\/div>\n    <\/form>\n\n    <!-- RÉSULTAT : affiché tout de suite, rien ne le retarde -->\n    <div class=\"ee-wrap\" id=\"ee-result\" hidden tabindex=\"-1\" aria-live=\"polite\">\n      <div class=\"ee-res tone-dark\" data-tone=\"dark\" id=\"ee-res-box\"><\/div>\n      <div class=\"ee-who\" style=\"margin-top:14px;\"><img data-ee-portrait alt=\"\" width=\"52\" height=\"52\" loading=\"lazy\" hidden><p><b><span data-ee-txt=\"conseiller\">Shawez<\/span> a reçu votre demande et vous rappelle au plus vite.<\/b> Pour un prix précis, il vient voir votre bien : c'est offert, sans engagement, et vous recevez ensuite un avis de valeur détaillé.<\/p><\/div>\n\n      <!-- la suite, tout de suite : choisir le créneau de la visite d'estimation -->\n      <div class=\"ee-apres ee-rdv\" id=\"ee-rdv\" hidden><\/div>\n\n      <!-- après le résultat seulement : retrouver son estimation -->\n      <div class=\"ee-apres\" id=\"ee-apres\" hidden>\n        <h2 class=\"ee-q\" id=\"ee-apres-titre\"><\/h2>\n        <p class=\"ee-sub\" id=\"ee-apres-txt\"><\/p>\n        <form class=\"form ee-mdp\" id=\"ee-mdp-form\" novalidate hidden>\n          <div class=\"field\"><label for=\"ee-mdp\">Mot de passe <small>(facultatif)<\/small><\/label><div class=\"ee-pw\"><input type=\"password\" id=\"ee-mdp\" autocomplete=\"new-password\" minlength=\"8\" maxlength=\"200\" aria-describedby=\"ee-mdp-hint\"><button type=\"button\" data-voir=\"ee-mdp\" aria-pressed=\"false\">Afficher<\/button><\/div><span class=\"hint\" id=\"ee-mdp-hint\">8 caractères au moins. Vous pourrez aussi le faire plus tard, depuis votre espace.<\/span><span class=\"msg\">8 caractères au moins.<\/span><\/div>\n          <p class=\"ee-err\" role=\"alert\" hidden><\/p><p class=\"ee-ok\" role=\"status\" hidden><\/p>\n          <div class=\"ee-nav\"><span><\/span><button type=\"submit\" class=\"btn\">Enregistrer ce mot de passe<\/button><\/div>\n        <\/form>\n        <div class=\"ee-apres-liens\"><a class=\"btn btn-primary\" id=\"ee-apres-espace\" href=\"/mon-espace/\">Ouvrir mon espace <span class=\"arw\">→<\/span><\/a><button type=\"button\" class=\"ee-skip\" id=\"ee-refaire\">Estimer un autre bien<\/button><\/div>\n      <\/div>\n    <\/div>\n  <\/div>\n<\/section>\n","mon-espace":"<section class=\"route ee\" data-route=\"/mon-espace\" id=\"r-mon-espace\">\n  <div class=\"page-head shell\">\n    <p class=\"label\">Mon espace<\/p>\n    <h1 class=\"display d-xl\" style=\"margin-top:14px;\" id=\"me-titre\">Vos estimations, <em>au même endroit.<\/em><\/h1>\n    <p class=\"lede\" id=\"me-lede\">Retrouvez vos estimations et l'avancement de votre dossier avec <span data-ee-txt=\"conseiller\">Shawez<\/span>.<\/p>\n  <\/div>\n  <div class=\"shell\">\n    <div class=\"ee-wrap\" id=\"me-load\" role=\"status\" aria-label=\"Chargement\"><div class=\"ee-load\"><\/div><\/div>\n\n    <!-- non connecté -->\n    <div class=\"ee-wrap\" id=\"me-out\" hidden>\n      <p class=\"ee-ok\" id=\"me-flash\" role=\"status\" hidden><\/p>\n\n      <!-- connexion : lien reçu par e-mail, ou mot de passe pour ceux qui en ont choisi un -->\n      <form class=\"form\" id=\"me-cnx\" novalidate>\n        <div class=\"ee-step\">\n          <div class=\"ee-head\"><h2 class=\"ee-q\">Ouvrir <em>mon espace.<\/em><\/h2><p class=\"ee-sub\" id=\"me-cnx-sub\">Indiquez l'e-mail donné le jour de votre estimation.<\/p><\/div>\n          <div class=\"field\" id=\"me-email-f\"><label for=\"me-email\">Votre e-mail<\/label><input type=\"email\" id=\"me-email\" autocomplete=\"username\" inputmode=\"email\" autocapitalize=\"off\" autocorrect=\"off\" spellcheck=\"false\"><span class=\"msg\">Indiquez l'e-mail de votre estimation.<\/span><\/div>\n          <div class=\"field\" id=\"me-mdp-f\" hidden><label for=\"me-mdp\">Mot de passe<\/label><div class=\"ee-pw\"><input type=\"password\" id=\"me-mdp\" autocomplete=\"current-password\"><button type=\"button\" data-voir=\"me-mdp\" aria-pressed=\"false\">Afficher<\/button><\/div><span class=\"msg\">Indiquez votre mot de passe.<\/span><\/div>\n          <div class=\"ee-envoye\" id=\"me-envoye\" role=\"status\" hidden>\n            <p><b>C'est envoyé !<\/b> Ouvrez le mail reçu sur <b id=\"me-envoye-a\"><\/b> et cliquez sur le lien pour entrer dans votre espace (valable 30 minutes). Pensez aux indésirables.<\/p>\n            <p class=\"ee-envoye-act\"><button type=\"button\" class=\"btn\" id=\"me-renvoi\">Renvoyer le lien<\/button><button type=\"button\" class=\"ee-skip\" id=\"me-autre\">Utiliser une autre adresse<\/button><\/p>\n          <\/div>\n          <p class=\"ee-err\" role=\"alert\" hidden><\/p><p class=\"ee-ok\" role=\"status\" hidden><\/p>\n          <div class=\"ee-nav ee-nav-col\" id=\"me-cnx-nav\">\n            <button type=\"submit\" class=\"btn btn-primary btn-lg\" id=\"me-cnx-btn\">Continuer <span class=\"arw\">→<\/span><\/button>\n          <\/div>\n          <div class=\"ee-links\"><button type=\"button\" id=\"me-lien-btn\" hidden>Recevoir plutôt un lien par e-mail<\/button><button type=\"button\" id=\"me-oubli-btn\">Mot de passe oublié ?<\/button><button type=\"button\" data-tab=\"ins\">Créer un espace sans estimation<\/button><a href=\"/estimer/\" data-ee-lien=\"estimer\">Faire une estimation<\/a><\/div>\n        <\/div>\n      <\/form>\n\n      <form class=\"form\" id=\"me-ins\" novalidate hidden>\n        <div class=\"hp\" aria-hidden=\"true\"><label for=\"me-hp\">Ne rien écrire ici<\/label><input type=\"text\" id=\"me-hp\" name=\"ee_hp_k7\" tabindex=\"-1\" autocomplete=\"off\" data-lpignore=\"true\" data-1p-ignore data-form-type=\"other\"><\/div>\n        <div class=\"ee-step\">\n          <div class=\"ee-head\"><h2 class=\"ee-q\">Créer <em>mon espace.<\/em><\/h2><p class=\"ee-sub\">Le plus simple reste de <a href=\"/estimer/\" data-ee-lien=\"estimer\">faire une estimation<\/a> : votre espace est créé au passage, sans mot de passe.<\/p><\/div>\n          <div class=\"field\"><span class=\"lab\" id=\"mi-civ-lab\">Civilité<\/span><div class=\"ee-civ\" role=\"group\" aria-labelledby=\"mi-civ-lab\"><button type=\"button\" class=\"pill\" data-civ=\"Mme\" aria-pressed=\"false\">Madame<\/button><button type=\"button\" class=\"pill\" data-civ=\"M.\" aria-pressed=\"false\">Monsieur<\/button><\/div><\/div>\n          <div class=\"row2\">\n            <div class=\"field\"><label for=\"mi-prenom\">Prénom<\/label><input type=\"text\" id=\"mi-prenom\" autocomplete=\"given-name\" maxlength=\"80\"><span class=\"msg\">Indiquez votre prénom.<\/span><\/div>\n            <div class=\"field\"><label for=\"mi-nom\">Nom<\/label><input type=\"text\" id=\"mi-nom\" autocomplete=\"family-name\" maxlength=\"80\"><span class=\"msg\">Indiquez votre nom.<\/span><\/div>\n          <\/div>\n          <div class=\"field\"><label for=\"mi-email\">E-mail<\/label><input type=\"email\" id=\"mi-email\" autocomplete=\"email\" inputmode=\"email\" maxlength=\"160\" autocapitalize=\"off\" autocorrect=\"off\" spellcheck=\"false\"><span class=\"msg\">Indiquez une adresse e-mail valide.<\/span><\/div>\n          <div class=\"field\"><label for=\"mi-tel\">Téléphone<\/label><input type=\"tel\" id=\"mi-tel\" autocomplete=\"tel\" inputmode=\"tel\" maxlength=\"30\"><span class=\"msg\">Indiquez un numéro valide.<\/span><\/div>\n          <div class=\"field\"><label for=\"mi-mdp\">Mot de passe<\/label><div class=\"ee-pw\"><input type=\"password\" id=\"mi-mdp\" autocomplete=\"new-password\" minlength=\"8\" aria-describedby=\"mi-mdp-hint\"><button type=\"button\" data-voir=\"mi-mdp\" aria-pressed=\"false\">Afficher<\/button><\/div><span class=\"hint\" id=\"mi-mdp-hint\">8 caractères au moins.<\/span><span class=\"msg\">8 caractères au moins.<\/span><\/div>\n          <div class=\"field\"><label class=\"consent\"><input type=\"checkbox\" id=\"mi-consent\"><span>J'accepte que GRAVELIN IMMO utilise ces informations pour gérer mon espace et me recontacter au sujet de mon projet. <a href=\"/politique-de-confidentialite/#espace-estimation\" data-ee-lien=\"confidentialite\">Confidentialité<\/a><\/span><\/label><span class=\"msg\">Cochez la case pour continuer.<\/span><\/div>\n          <p class=\"ee-err\" role=\"alert\" hidden><\/p>\n          <div class=\"ee-nav\"><button type=\"button\" class=\"btn\" data-tab=\"cnx\">Retour<\/button><button type=\"submit\" class=\"btn btn-primary btn-lg\">Créer mon espace <span class=\"arw\">→<\/span><\/button><\/div>\n        <\/div>\n      <\/form>\n\n      <form class=\"form\" id=\"me-oubli\" novalidate hidden>\n        <div class=\"ee-step\">\n          <div class=\"ee-head\"><h2 class=\"ee-q\">Mot de passe <em>oublié.<\/em><\/h2><p class=\"ee-sub\">Indiquez votre e-mail : vous recevez un lien pour en choisir un nouveau.<\/p><\/div>\n          <div class=\"field\"><label for=\"mo-email\">E-mail<\/label><input type=\"email\" id=\"mo-email\" autocomplete=\"email\" inputmode=\"email\" autocapitalize=\"off\" autocorrect=\"off\" spellcheck=\"false\"><span class=\"msg\">Indiquez votre e-mail.<\/span><\/div>\n          <p class=\"ee-ok\" role=\"status\" hidden><\/p><p class=\"ee-err\" role=\"alert\" hidden><\/p>\n          <div class=\"ee-nav\"><button type=\"button\" class=\"btn\" data-tab=\"cnx\">Retour<\/button><button type=\"submit\" class=\"btn btn-primary btn-lg\">Recevoir le lien <span class=\"arw\">→<\/span><\/button><\/div>\n        <\/div>\n      <\/form>\n\n      <form class=\"form\" id=\"me-reinit\" novalidate hidden>\n        <div class=\"ee-step\">\n          <div class=\"ee-head\"><h2 class=\"ee-q\">Nouveau <em>mot de passe.<\/em><\/h2><\/div>\n          <div class=\"field\"><label for=\"mr-mdp\">Nouveau mot de passe<\/label><div class=\"ee-pw\"><input type=\"password\" id=\"mr-mdp\" autocomplete=\"new-password\" minlength=\"8\" aria-describedby=\"mr-mdp-hint\"><button type=\"button\" data-voir=\"mr-mdp\" aria-pressed=\"false\">Afficher<\/button><\/div><span class=\"hint\" id=\"mr-mdp-hint\">8 caractères au moins.<\/span><span class=\"msg\">8 caractères au moins.<\/span><\/div>\n          <p class=\"ee-err\" role=\"alert\" hidden><\/p>\n          <div class=\"ee-nav\"><span><\/span><button type=\"submit\" class=\"btn btn-primary btn-lg\">Enregistrer <span class=\"arw\">→<\/span><\/button><\/div>\n        <\/div>\n      <\/form>\n    <\/div>\n\n    <!-- connecté -->\n    <div class=\"ee-wrap\" id=\"me-in\" hidden>\n      <p class=\"ee-ok\" id=\"me-verif-ok\" role=\"status\" hidden>Adresse e-mail confirmée. Merci !<\/p>\n      <div class=\"ee-who\" id=\"me-attente\" hidden style=\"margin-bottom:18px;\"><p><\/p><\/div>\n      <div class=\"ee-who\" id=\"me-verif\" hidden style=\"margin-bottom:18px;\"><p><b>Confirmez votre adresse e-mail<\/b> en ouvrant le lien reçu par e-mail. <button type=\"button\" class=\"ee-skip\" id=\"me-verif-btn\" style=\"margin-left:4px;\">Recevoir un nouveau lien<\/button><\/p><\/div>\n      <div class=\"ee-hello\"><div><p class=\"label\" id=\"me-bonjour\"><\/p><\/div><a class=\"btn btn-primary\" href=\"/estimer/\" data-ee-lien=\"estimer\">Nouvelle estimation <span class=\"arw\">→<\/span><\/a><\/div>\n      <div class=\"ee-cards\" id=\"me-cards\"><\/div>\n\n      <div class=\"ee-sec\">\n        <h2>Mes informations<\/h2>\n        <ul class=\"ee-kv\" id=\"me-infos\"><\/ul>\n\n        <form class=\"form ee-mdp\" id=\"me-mdp-form\" novalidate hidden style=\"margin-top:18px;\">\n          <div class=\"ee-step\">\n            <div class=\"ee-head\"><h2 class=\"ee-q ee-q-s\" id=\"me-mdp-titre\">Choisir <em>un mot de passe<\/em><\/h2><p class=\"ee-sub\" id=\"me-mdp-sub\">Facultatif : il permet de vous connecter sans attendre un e-mail.<\/p><\/div>\n            <div class=\"field\" id=\"mp-actuel-f\" hidden><label for=\"mp-actuel\">Mot de passe actuel<\/label><input type=\"password\" id=\"mp-actuel\" autocomplete=\"current-password\"><span class=\"msg\">Indiquez votre mot de passe actuel.<\/span><\/div>\n            <div class=\"field\"><label for=\"mp-mdp\">Nouveau mot de passe<\/label><div class=\"ee-pw\"><input type=\"password\" id=\"mp-mdp\" autocomplete=\"new-password\" minlength=\"8\" aria-describedby=\"mp-mdp-hint\"><button type=\"button\" data-voir=\"mp-mdp\" aria-pressed=\"false\">Afficher<\/button><\/div><span class=\"hint\" id=\"mp-mdp-hint\">8 caractères au moins.<\/span><span class=\"msg\">8 caractères au moins.<\/span><\/div>\n            <p class=\"ee-err\" role=\"alert\" hidden><\/p>\n            <div class=\"ee-nav\"><button type=\"button\" class=\"btn\" id=\"me-mdp-annule\">Annuler<\/button><button type=\"submit\" class=\"btn btn-primary\">Enregistrer<\/button><\/div>\n          <\/div>\n        <\/form>\n        <p class=\"ee-ok\" id=\"me-mdp-ok\" role=\"status\" hidden style=\"margin-top:14px;\">Mot de passe enregistré.<\/p>\n\n        <div class=\"ee-links\"><a href=\"/admin/\" id=\"me-admin\" data-ee-lien=\"admin\" hidden>Espace agence<\/a><button type=\"button\" id=\"me-mdp-btn\">Choisir un mot de passe<\/button><button type=\"button\" id=\"me-export\">Télécharger mes données<\/button><button type=\"button\" id=\"me-logout\">Me déconnecter<\/button><button type=\"button\" id=\"me-logout-all\">Me déconnecter de tous mes appareils<\/button><button type=\"button\" class=\"ee-danger\" id=\"me-del-btn\">Supprimer mon espace<\/button><\/div>\n        <p class=\"ee-err\" id=\"me-compte-err\" role=\"alert\" hidden><\/p>\n        <p class=\"hint ee-rgpd\">Vos données servent seulement à suivre votre projet avec <span data-ee-txt=\"conseiller\">Shawez<\/span> et GRAVELIN IMMO. Vous pouvez les télécharger ou supprimer votre espace à tout moment. <a href=\"/politique-de-confidentialite/#espace-estimation\" data-ee-lien=\"confidentialite\">Confidentialité<\/a><\/p>\n        <form class=\"form\" id=\"me-del\" novalidate hidden style=\"margin-top:18px;\">\n          <div class=\"ee-step\">\n            <div class=\"ee-head\"><h2 class=\"ee-q ee-q-s\">Supprimer <em>mon espace<\/em><\/h2><p class=\"ee-sub\" id=\"md-sub\">Votre compte, vos estimations et vos fichiers sont effacés définitivement.<\/p><\/div>\n            <div class=\"field\" id=\"md-mdp-f\"><label for=\"md-mdp\">Mot de passe<\/label><input type=\"password\" id=\"md-mdp\" autocomplete=\"current-password\"><span class=\"msg\">Indiquez votre mot de passe.<\/span><\/div>\n            <div class=\"field\" id=\"md-conf-f\" hidden><label for=\"md-conf\">Écrivez SUPPRIMER pour confirmer<\/label><input type=\"text\" id=\"md-conf\" autocomplete=\"off\" autocapitalize=\"characters\"><span class=\"msg\">Écrivez SUPPRIMER (en majuscules) pour confirmer.<\/span><\/div>\n            <p class=\"ee-err\" role=\"alert\" hidden><\/p>\n            <div class=\"ee-nav\"><button type=\"button\" class=\"btn\" id=\"me-del-annule\">Annuler<\/button><button type=\"submit\" class=\"btn ee-btn-danger\">Supprimer définitivement<\/button><\/div>\n          <\/div>\n        <\/form>\n      <\/div>\n    <\/div>\n  <\/div>\n<\/section>\n","admin":"<section class=\"route ee\" data-route=\"/admin\" id=\"r-admin\">\n  <div class=\"page-head shell\">\n    <p class=\"label\">Espace agence<\/p>\n    <h1 class=\"display d-xl\" style=\"margin-top:14px;\">Dossiers <em>vendeurs.<\/em><\/h1>\n    <p class=\"lede\" id=\"ad-lede\">Chaque dossier, son statut et sa prochaine action. Les actions en retard sont en haut.<\/p>\n  <\/div>\n  <div class=\"shell\">\n    <div class=\"ee-wrap\" id=\"ad-load\" role=\"status\" aria-label=\"Chargement\"><div class=\"ee-load\"><\/div><\/div>\n    <div class=\"ee-wrap\" id=\"ad-no\" hidden>\n      <form class=\"form\" id=\"ad-lien\" novalidate>\n        <div class=\"ee-step\">\n          <div class=\"ee-head\"><h2 class=\"ee-q\">Ouvrir <em>l'espace agence.<\/em><\/h2><p class=\"ee-sub\" id=\"ad-no-txt\">Cet espace est réservé à l'agence. Indiquez votre adresse : vous recevez un lien qui l'ouvre, sans mot de passe.<\/p><\/div>\n          <div class=\"field\"><label for=\"ad-email\">E-mail de l'agence<\/label><input type=\"email\" id=\"ad-email\" autocomplete=\"username\" inputmode=\"email\" autocapitalize=\"off\" autocorrect=\"off\" spellcheck=\"false\"><span class=\"msg\">Indiquez votre adresse e-mail.<\/span><\/div>\n          <p class=\"ee-err\" role=\"alert\" hidden><\/p><p class=\"ee-ok\" role=\"status\" hidden><\/p>\n          <div class=\"ee-nav ee-nav-col\"><button type=\"submit\" class=\"btn btn-primary btn-lg\" id=\"ad-lien-btn\">Recevoir mon lien de connexion <span class=\"arw\">→<\/span><\/button><a class=\"btn btn-lg\" href=\"/mon-espace/\" data-ee-lien=\"espace\">Me connecter avec un mot de passe<\/a><\/div>\n          <div class=\"ee-links\" id=\"ad-no-compte\" hidden><button type=\"button\" id=\"ad-no-sortir\">Me déconnecter et changer de compte<\/button><\/div>\n        <\/div>\n      <\/form>\n    <\/div>\n    <div class=\"ee-wide\" id=\"ad-in\" hidden>\n      <div class=\"ee-ad-barre\">\n        <p class=\"ee-ad-maj\" id=\"ad-maj\" role=\"status\"><\/p>\n        <div class=\"ee-links\"><button type=\"button\" id=\"ad-actualiser\">Actualiser<\/button><a href=\"/admin/promesses/\" data-ee-lien=\"promesses\">Les 7 promesses<\/a><a href=\"/mon-espace/\" data-ee-lien=\"espace\">Mon espace<\/a><button type=\"button\" id=\"ad-sortir\">Me déconnecter<\/button><\/div>\n      <\/div>\n      <p class=\"ee-err\" id=\"ad-err\" role=\"alert\" hidden><\/p>\n      <div class=\"ee-stats\" id=\"ad-stats\" role=\"group\" aria-label=\"Vues rapides : un clic filtre la liste\"><\/div>\n      <div class=\"ee-tabs\" role=\"group\" aria-label=\"Vue\"><button type=\"button\" class=\"pill\" data-vue=\"demandes\" aria-pressed=\"true\">Demandes<\/button><button type=\"button\" class=\"pill\" data-vue=\"comptes\" aria-pressed=\"false\">Comptes<\/button><button type=\"button\" class=\"pill\" data-vue=\"biens\" aria-pressed=\"false\">Biens<\/button><button type=\"button\" class=\"pill\" data-vue=\"reglages\" aria-pressed=\"false\">Réglages<\/button><\/div>\n      <div id=\"ad-demandes\">\n        <div class=\"ee-tools\">\n          <input type=\"search\" id=\"ad-q\" placeholder=\"Nom, e-mail, téléphone, commune, référence…\" aria-label=\"Rechercher\">\n          <select id=\"ad-site\" aria-label=\"Site\"><option value=\"\">Les deux sites<\/option><option value=\"shawez\">shawez-immo.com<\/option><option value=\"gravelin\">gravelin-immo.com<\/option><\/select>\n          <select id=\"ad-statut\" aria-label=\"Statut\"><option value=\"\">Tous les statuts<\/option><\/select>\n          <a class=\"btn\" id=\"ad-export\" href=\"/api/espace/admin/export.csv?quoi=demandes\" download>Export CSV<\/a>\n        <\/div>\n        <div class=\"ee-tools ee-tools-2\">\n          <label class=\"ee-check-l\"><input type=\"checkbox\" id=\"ad-essais\">Masquer les essais<\/label>\n          <p class=\"ee-nb\" id=\"ad-nb\" role=\"status\" aria-live=\"polite\"><\/p>\n        <\/div>\n        <div class=\"ee-rows\" id=\"ad-rows\"><\/div>\n        <div class=\"ee-plus\"><button type=\"button\" class=\"btn\" id=\"ad-plus\" hidden>Afficher plus de dossiers<\/button><\/div>\n      <\/div>\n      <div id=\"ad-comptes\" hidden>\n        <div class=\"ee-tools\">\n          <input type=\"search\" id=\"ad-qc\" placeholder=\"Nom, e-mail, téléphone…\" aria-label=\"Rechercher un compte\">\n          <a class=\"btn\" id=\"ad-export-c\" href=\"/api/espace/admin/export.csv?quoi=comptes\" download>Export CSV<\/a>\n        <\/div>\n        <div class=\"ee-rows\" id=\"ad-crows\"><\/div>\n      <\/div>\n      <div id=\"ad-biens\" hidden>\n        <div class=\"ee-card\">\n          <h3>Mes biens : qui regarde, qui veut visiter<\/h3>\n          <p class=\"meta\">Par bien, sur les 30 derniers jours : vues de la fiche, clics sur « Visiter ce bien », vidéo regardée (son activé ou vidéo ouverte), WhatsApp, appels, et visites réservées en 2 clics. Sans cookie : on compte des gestes, jamais des personnes. Les essais ne comptent pas.<\/p>\n          <div class=\"acts\"><button type=\"button\" class=\"btn\" id=\"ad-mb-btn\">Actualiser<\/button><\/div>\n          <div id=\"ad-mb\" data-test=\"mesures-biens\"><\/div>\n        <\/div>\n      <\/div>\n      <div id=\"ad-reglages\" hidden>\n        <div class=\"ee-card\" style=\"margin-bottom:14px;\">\n          <h3>Visites d'estimation<\/h3>\n          <p class=\"meta\">Aujourd'hui, le vendeur propose jusqu'à 3 créneaux (du lundi au samedi, 9 h – 19 h, 45 minutes) et vous confirmez d'un clic dans son dossier. Si vous créez une page de réservation dans Google Agenda (« Planning de rendez-vous »), collez son lien ici : le vendeur choisira directement dans votre agenda.<\/p>\n          <div class=\"field\"><label for=\"ad-rdv-url\">Lien de la page de réservation Google Agenda <small>(facultatif)<\/small><\/label><input type=\"url\" id=\"ad-rdv-url\" inputmode=\"url\" placeholder=\"https://calendar.app.google/…\" autocapitalize=\"off\" autocorrect=\"off\" spellcheck=\"false\"><\/div>\n          <div class=\"acts\"><button type=\"button\" class=\"btn\" id=\"ad-rdv-save\">Enregistrer<\/button><\/div>\n          <p class=\"ee-ok\" id=\"ad-rdv-out\" role=\"status\" hidden><\/p>\n        <\/div>\n        <div class=\"ee-card\" style=\"margin-bottom:14px;\">\n          <h3>Votre agenda Google : les créneaux pris ne sont plus proposés<\/h3>\n          <p class=\"meta\" id=\"ad-ics-etat\">Les rendez-vous pris sur le site (accueil, contact, après une estimation) évitent déjà les visites fixées ici. Pour qu'ils évitent aussi tout votre agenda Google : Google Agenda sur ordinateur → ⚙ Paramètres → votre agenda → « Intégrer l'agenda » → copiez « Adresse secrète au format iCal » et collez-la ici. Lecture seule : le site n'écrit rien dans votre agenda. Cette adresse est secrète : ne la donnez à personne d'autre.<\/p>\n          <div class=\"field\"><label for=\"ad-ics\">Adresse secrète au format iCal <small>(facultatif)<\/small><\/label><input type=\"url\" id=\"ad-ics\" inputmode=\"url\" placeholder=\"https://calendar.google.com/calendar/ical/…/basic.ics\" autocapitalize=\"off\" autocorrect=\"off\" spellcheck=\"false\" autocomplete=\"off\"><\/div>\n          <div class=\"acts\"><button type=\"button\" class=\"btn\" id=\"ad-ics-save\">Enregistrer<\/button><button type=\"button\" class=\"btn\" id=\"ad-ics-off\">Délier l'agenda<\/button><\/div>\n          <p class=\"ee-ok\" id=\"ad-ics-out\" role=\"status\" hidden><\/p>\n        <\/div>\n        <div class=\"ee-card\">\n          <h3>Demandes dans Google Sheets<\/h3>\n          <p class=\"meta\">L'onglet « Site » du tableau « Relance leads » se remplit tout seul : une formule relit les demandes environ toutes les heures. Colonnes : date, site, civilité, prénom, nom, téléphone, e-mail, adresse du bien, type, surface, fourchette, délai de vente, prix idéal, statut, prochaine action, notes, référence. Le statut, la date de rappel et les notes se changent ici, dans chaque demande.<\/p>\n          <p class=\"meta\">Les 7 promesses se suivent dans le même tableau : dans un onglet « Promesses », collez en A1 la formule de l'onglet « Site » en remplaçant <b>site.csv<\/b> par <b>promesses.csv<\/b>. Sept lignes, aucun nom.<\/p>\n          <p class=\"meta\">Besoin d'une nouvelle clé (tableau partagé par erreur, par exemple) ? Le bouton en crée une et coupe l'ancienne : collez alors les nouvelles formules dans la cellule A1 des onglets « Site » et « Promesses ».<\/p>\n          <div class=\"acts\"><button type=\"button\" class=\"btn\" id=\"ad-flux\">Créer une nouvelle clé<\/button><\/div>\n          <p class=\"ee-ok\" id=\"ad-flux-out\" role=\"status\" hidden><\/p>\n        <\/div>\n        <div class=\"ee-card\" style=\"margin-top:14px;\">\n          <h3>Journal de l'agence<\/h3>\n          <p class=\"meta\">Qui a exporté les données, supprimé un dossier ou un compte, fabriqué un lien de connexion ou changé un réglage, et quand. Utile pour le RGPD : chaque accès aux données est tracé.<\/p>\n          <div class=\"acts\"><button type=\"button\" class=\"btn\" id=\"ad-ja-btn\">Afficher le journal<\/button><\/div>\n          <div id=\"ad-ja\" hidden><\/div>\n        <\/div>\n      <\/div>\n    <\/div>\n  <\/div>\n<\/section>\n","promesses":"<section class=\"route ee\" data-route=\"/admin/promesses\" id=\"r-promesses\">\n  <div class=\"page-head shell\">\n    <p class=\"label\">Espace agence<\/p>\n    <h1 class=\"display d-xl\" style=\"margin-top:14px;\">Les 7 <em>promesses.<\/em><\/h1>\n    <p class=\"lede\">Ce que vous promettez à chaque vendeur : tenu ou raté, sur 7 et 30 jours.<\/p>\n  <\/div>\n  <div class=\"shell\">\n    <div class=\"ee-wrap\" id=\"pr-load\" role=\"status\" aria-label=\"Chargement\"><div class=\"ee-load\"><\/div><\/div>\n    <div class=\"ee-wrap\" id=\"pr-no\" hidden>\n      <div class=\"ee-empty\"><p id=\"pr-no-txt\">Cette page est réservée à l'agence. Ouvrez d'abord l'espace agence, puis revenez ici.<\/p><a class=\"btn btn-primary\" href=\"/admin/\" data-ee-lien=\"admin\">Ouvrir l'espace agence <span class=\"arw\">→<\/span><\/a><\/div>\n    <\/div>\n    <div class=\"ee-wide\" id=\"pr-in\" hidden>\n      <div class=\"ee-pr-tete\">\n        <div class=\"ee-tabs\" role=\"group\" aria-label=\"Période\"><button type=\"button\" class=\"pill\" data-jours=\"7\" aria-pressed=\"true\">7 jours<\/button><button type=\"button\" class=\"pill\" data-jours=\"30\" aria-pressed=\"false\">30 jours<\/button><\/div>\n        <div class=\"ee-pr-liens\"><a class=\"btn\" id=\"pr-export\" href=\"/api/espace/admin/promesses.csv?jours=7\" download>Export CSV<\/a><a class=\"btn\" href=\"/admin/\" data-ee-lien=\"admin\">Dossiers vendeurs<\/a><\/div>\n      <\/div>\n      <div class=\"ee-stats ee-pr-stats\" id=\"pr-stats\" aria-live=\"polite\"><\/div>\n      <p class=\"ee-note warn\" id=\"pr-alerte\" hidden><\/p>\n      <div class=\"ee-cards\" id=\"pr-cartes\"><\/div>\n      <p class=\"ee-fine\" id=\"pr-pied\"><\/p>\n    <\/div>\n  <\/div>\n<\/section>\n"};
function demarrer(){
  var boite=document.querySelector('[data-espace-estimation]'); if(!boite)return;
  var page=boite.getAttribute('data-espace-estimation'); if(!FRAGMENTS[page])return;
  boite.classList.add('ee-module'); boite.innerHTML=FRAGMENTS[page];
/* Espace estimation : outils communs (estimer, mon-espace, admin).
   Le même module sert les deux sites ; ce qui change d'un site à l'autre est dans EE_CONF (défini avant ce script
   par la page, sinon valeurs de shawez-immo.com) et dans la feuille de thème. */
var EE=(function(){
  'use strict';
  var CONF={site:'',api:'/api/espace',estimer:'/estimer/',espace:'/mon-espace/',admin:'/admin/',promesses:'/admin/promesses/',
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
      return r.json().catch(function(){return {};}).then(function(d){
        d=d||{};d._status=r.status;if(r.status>=500&&!d.error)d.error='serveur';
        // session expirée pendant qu'on travaillait : la page le dit une fois et propose de se reconnecter
        if(r.status===401&&d.error==='connexion'&&chemin!=='/moi'){ try{window.dispatchEvent(new CustomEvent('ee:session',{detail:{chemin:chemin}}));}catch(e){} }
        return d;
      });
    },function(){clearTimeout(t);return {_status:0,error:'reseau'};});
  }
  /* Action irréversible : le premier clic arme le bouton (« Confirmer : … »), le second agit. Sans second clic dans les
     8 secondes, le bouton reprend son texte : un clic oublié ne supprime jamais rien plus tard. Rend true au second clic. */
  function confirmer(b,txt,ms){
    if(b.getAttribute('data-ok')==='1'){ clearTimeout(b._eeT); b.removeAttribute('data-ok'); if(b._eeTxt!=null)b.textContent=b._eeTxt; return true; }
    b._eeTxt=b.textContent; b.setAttribute('data-ok','1'); b.textContent=txt;
    clearTimeout(b._eeT); b._eeT=setTimeout(function(){ b.removeAttribute('data-ok'); b.textContent=b._eeTxt; },ms||8000);
    return false;
  }
  /* Bouton occupé pendant une requête : désactivé, annoncé (aria-busy), texte d'attente le cas échéant. */
  function occupe(b,on,txt){
    if(!b)return;
    if(on){ b.disabled=true; b.setAttribute('aria-busy','true'); if(txt){ b._eeAvant=b.innerHTML; b.textContent=txt; } }
    else { b.disabled=false; b.removeAttribute('aria-busy'); if(b._eeAvant!=null){ b.innerHTML=b._eeAvant; b._eeAvant=null; } }
  }
  function retarder(fn,ms){ var t=null; return function(){ var a=arguments, s=this; clearTimeout(t); t=setTimeout(function(){fn.apply(s,a);},ms||150); }; }
  /* Téléchargement d'un fichier de l'API (export) : la session expirée se dit clairement au lieu d'un fichier d'erreur. */
  function telecharger(chemin,nom){
    return fetch(CONF.api+chemin,{credentials:'same-origin'}).then(function(r){
      if(!r.ok)return r.json().catch(function(){return {};}).then(function(d){ d._status=r.status; if(r.status===401)try{window.dispatchEvent(new CustomEvent('ee:session',{detail:{chemin:chemin}}));}catch(e){} return d; });
      return r.blob().then(function(b){ var u=URL.createObjectURL(b), a=document.createElement('a'); a.href=u; a.download=nom; document.body.appendChild(a); a.click(); setTimeout(function(){URL.revokeObjectURL(u);a.remove();},1500); return {_status:200}; });
    },function(){ return {_status:0,error:'reseau'}; });
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
    stockage_plein:"L'espace de stockage est plein : envoyez ce fichier par e-mail à "+CONF.email+".",
    visite_fixee:"Une visite est déjà fixée pour ce bien.",
    visite_close:"Ce dossier a avancé : la visite se fixe par téléphone.",
    avis_absent:"Créez d'abord le PDF de l'avis de valeur.",
    admin_non_verifie:"Votre adresse doit d'abord être confirmée par le lien reçu par e-mail.",
    compte_agence:"C'est un compte de l'agence : il ne se modifie pas d'ici.",
    soi_meme:"Vous ne pouvez pas supprimer votre propre compte d'ici.",
    format:"Requête refusée.",json:"Requête refusée.",
    espace_existe:"Ce dossier a déjà un espace : rechargez la page.",
    creneau_pris:"Ce créneau vient d'être pris : choisissez-en un autre."
  };
  function message(d){return MSG[d&&d.error]||MSG.serveur;}
  var CHAMPS={email:"L'adresse e-mail n'est pas valide.",telephone:"Le numéro de téléphone n'est pas valide.",prenom:"Indiquez votre prénom.",nom:"Indiquez votre nom.",mot_de_passe:"Le mot de passe doit compter 8 caractères au moins.",consentement:"Cochez la case pour continuer.",adresse:"L'adresse du bien est incomplète.",surface:"La surface n'est pas valide.",confirmation:"Écrivez SUPPRIMER pour confirmer.",creneaux:"Ce créneau n'est plus proposé : choisissez-en un autre.",debut:"La date de la visite n'est pas valide.",prix_bas:"Indiquez la fourchette de prix (basse et haute).",prix_haut:"La valeur haute doit dépasser la valeur basse.",agenda_ics:"Collez l'« Adresse secrète au format iCal » de Google Agenda (https://calendar.google.com/calendar/ical/…/basic.ics).",rdv_url:"Collez le lien de votre page de réservation Google Agenda (https://calendar.app.google/…).",atouts:"8 lignes au plus, 240 caractères par ligne.",vigilance:"8 lignes au plus, 240 caractères par ligne.",visite_le:"Indiquez la date de la visite (aujourd'hui au plus tard).",texte:"Écrivez ou dictez le compte rendu (3 000 caractères au plus).",montant:"Indiquez le montant de l'offre, en euros.",recue_le:"La date de l'offre n'est pas valide.",conditions:"Les conditions sont trop longues (1 500 caractères au plus).",etapes:"Une date d'étape n'est pas valide.",nom_notaire:"Le nom du notaire est trop long.",coordonnees:"Les coordonnées sont trop longues (300 caractères au plus)."};
  function messageChamp(d){return (d&&d.error==='champs'&&CHAMPS[d.champ])||message(d);}

  function wa(txt){return 'https://wa.me/'+CONF.tel.replace(/\D/g,'')+'?text='+encodeURIComponent(txt);}

  /* Bloc résultat (fond sombre) : la fourchette, puis d'où elle vient. */
  function resultat(res,ref,adresse){
    var h='';
    if(res&&res.fourchette){
      h+='<p class="label">Votre fourchette de prix · indicative</p>'+
        '<p class="ee-price" data-test="fourchette"><span>'+euros(res.bas)+'</span><em>–</em><span>'+euros(res.haut)+'</span></p>'+
        '<p class="ee-m2">Soit environ <b>'+euros(res.prix_m2)+'/m²</b>'+(adresse?' · '+esc(adresse):'')+'</p>'+
        '<p class="ee-warn"><span><b>Indicatif, à confirmer par une visite.</b> Le calcul en ligne ne voit ni la lumière, ni la vue, ni les finitions. Une visite chez vous les voit : c\'est elle qui donne votre prix précis, offerte et sans engagement.</span></p>'+
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
        '<p class="ee-price ee-price-txt" data-test="rappel">Je vous rappelle <em>au plus vite.</em></p>'+
        '<p class="ee-m2">'+(r==='peu_de_ventes'?"Il y a eu trop peu de ventes comparables près de chez vous"+(res.comparables!=null?' ('+res.comparables+' seulement)':'')+" pour donner une fourchette fiable. Pas de prix au hasard : "+CONF.conseiller+" étudie votre bien lui-même.":r==='type'?"Pour ce type de bien, l'estimation se fait sur pièces : "+CONF.conseiller+" étudie votre bien lui-même.":r==='hors_zone'?"Ce secteur est hors de la Côte-d'Or : "+CONF.conseiller+" vous dit au téléphone ce qu'il peut faire pour vous.":CONF.conseiller+" étudie votre bien lui-même et vous donne une première fourchette au téléphone.")+'</p>'+
        (res&&res.donnees_du?'<p class="ee-warn"><span>Données des ventes réelles (DVF) à jour de '+mois(res.donnees_du)+'.</span></p>':'');
    }
    if(ref)h+='<ul class="ee-facts ee-ref"><li><span>Référence</span><span data-test="reference">'+esc(ref)+'</span></li></ul>';
    /* « Prendre rendez-vous » : appel sur téléphone ; sur ordinateur (un lien tel: n'y fait rien), WhatsApp avec le message prêt. */
    var ordi=!!(window.matchMedia&&window.matchMedia('(hover: hover) and (pointer: fine)').matches);
    var rdv=ordi?wa('Bonjour '+CONF.conseiller+', je viens de faire une estimation'+(ref?' (réf. '+ref+')':'')+', je voudrais un rendez-vous pour une estimation sur place.'):'tel:'+CONF.tel;
    h+='<div class="btn-row">'+
      '<a class="btn btn-primary btn-lg" data-test="rdv" href="'+rdv+'"'+(ordi?' target="_blank" rel="noopener"':'')+'>Obtenir mon prix précis sur place <span class="arw">→</span></a>'+
      '<a class="btn btn-ghost" href="'+wa('Bonjour '+CONF.conseiller+', je viens de faire mon estimation en ligne'+(ref?' (réf. '+ref+')':'')+'. ')+'" target="_blank" rel="noopener">Écrire sur WhatsApp</a>'+
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

  /* ---------- Dates à l'heure de Paris (le vendeur peut être ailleurs : la visite, elle, est à Dijon) ---------- */
  function fr(iso,o){ o=o||{}; o.timeZone='Europe/Paris'; try{return new Date(iso).toLocaleDateString('fr-FR',o);}catch(e){return String(iso);} }
  function heure(iso){ try{ var p=new Intl.DateTimeFormat('fr-FR',{timeZone:'Europe/Paris',hour:'numeric',minute:'2-digit',hourCycle:'h23'}).formatToParts(new Date(iso)),h='',m=''; p.forEach(function(x){if(x.type==='hour')h=String(+x.value);if(x.type==='minute')m=x.value;}); return h+' h'+(m!=='00'?' '+m:''); }catch(e){return '';} }
  function jourLong(j){ if(!j)return ''; try{return new Date(String(j).slice(0,10)+'T12:00:00Z').toLocaleDateString('fr-FR',{timeZone:'UTC',weekday:'long',day:'numeric',month:'long'});}catch(e){return String(j);} }
  function quand(iso){ return fr(iso,{weekday:'long',day:'numeric',month:'long'})+' à '+heure(iso); }
  function quandCourt(iso){ return fr(iso,{weekday:'short',day:'numeric',month:'short'}).replace(/\./g,'')+' '+heure(iso); }

  /* ---------- Visite d'estimation : le vendeur propose jusqu'à trois créneaux, l'agence confirme ----------
     racine : l'élément où dessiner ; o : { demande, visite, possible, rdvUrl, onChange(reponse) }.
     Le même bloc sert après le résultat (/estimer/) et dans chaque dossier de /mon-espace/. */
  function visite(racine,o){
    var choisis=[], jours=null, jourOuvert=0, ouvert=false, v=o.visite||null;
    function fixee(){ return v&&v.etat==='fixee'&&v.debut; }
    function passee(){ return fixee()&&new Date(v.debut).getTime()<Date.now(); }
    function dessiner(){
      var h='<h3 class="ee-rdv-t">Votre prix précis, chez vous</h3>';
      if(fixee()){
        h+='<p class="ee-rdv-ok" data-test="visite-fixee"><b>'+esc(quand(v.debut).replace(/^./,function(c){return c.toUpperCase();}))+'</b><span>'+(passee()?'Visite faite. ':'')+esc(CONF.conseiller)+' vient voir votre bien : comptez '+(v.duree||45)+' minutes. Offert et sans engagement.</span></p>';
        if(!passee()){
          h+='<p class="ee-rdv-prep">Pour gagner du temps, si vous les avez sous la main : le titre de propriété, la dernière taxe foncière, les diagnostics, le montant des charges et la liste des travaux réalisés.</p>';
          if(o.possible&&!ouvert)h+='<div class="ee-links"><button type="button" data-rdv-ouvrir>Demander un autre créneau</button><a href="tel:'+CONF.tel+'">Appeler '+esc(CONF.conseiller)+'</a></div>';
        }
      } else if(v&&v.etat==='demandee'&&!ouvert){
        h+='<p class="ee-rdv-ok" data-test="visite-demandee"><b>Créneaux envoyés à '+esc(CONF.conseiller)+'</b><span>'+(v.creneaux||[]).map(function(c){return esc(quand(c));}).join('<br>')+'</span></p>'+
          '<p class="ee-rdv-prep">'+esc(CONF.conseiller)+' confirme l\'un d\'eux au plus vite. Vous recevez la confirmation ici'+(o.email?' et par e-mail':'')+'.</p>'+
          (o.possible?'<div class="ee-links"><button type="button" data-rdv-ouvrir>Changer mes créneaux</button></div>':'');
      } else if(!o.possible){
        racine.hidden=true; racine.innerHTML=''; return;
      } else if(o.rdvUrl&&!ouvert){
        h+='<p class="ee-rdv-prep">'+esc(CONF.conseiller)+' vient chez vous pour votre prix précis : 45 minutes, offert et sans engagement. Choisissez votre créneau dans son agenda, en 2 clics.</p>'+
          '<div class="ee-rdv-go"><a class="btn btn-primary" href="'+esc(o.rdvUrl)+'" target="_blank" rel="noopener" data-rdv-agenda>Choisir mon créneau <span class="arw">→</span></a></div>';
      } else if(!ouvert){
        h+='<p class="ee-rdv-prep">'+esc(CONF.conseiller)+' vient chez vous pour votre prix précis, sous 48 h si vous le souhaitez : 45 minutes, offert et sans engagement. Vous restez libre ensuite.</p>'+
          '<div class="ee-rdv-go"><button type="button" class="btn btn-primary" data-rdv-ouvrir>Choisir mon créneau <span class="arw">→</span></button></div>';
      }
      if(ouvert)h+=selecteur();
      racine.hidden=false; racine.innerHTML=h;
    }
    function selecteur(){
      if(!jours)return '<div class="ee-load" style="height:120px;" role="status" aria-label="Chargement des créneaux"></div>';
      if(!jours.length)return '<p class="ee-err">Aucun créneau en ligne pour le moment : appelez '+esc(CONF.conseiller)+' au <a href="tel:'+CONF.tel+'">'+CONF.telAffiche+'</a>, il trouve une date avec vous.</p>';
      var j=jours[jourOuvert]||jours[0];
      return '<p class="ee-rdv-prep" id="'+idAide+'">Choisissez jusqu\'à 3 créneaux qui vous arrangent : '+esc(CONF.conseiller)+' confirme l\'un d\'eux au plus vite.</p>'+
        '<div class="ee-days" role="group" aria-label="Jour">'+jours.map(function(x,k){
          var n=choisis.filter(function(c){return x.heures.some(function(hh){return hh.debut===c;});}).length;
          return '<button type="button" class="pill" data-rdv-jour="'+k+'" aria-pressed="'+(k===jourOuvert)+'"><b>'+esc(x.court)+'</b>'+(x.sous48h?'<small>sous 48 h</small>':'')+(n?'<i aria-label="'+n+' choisi'+(n>1?'s':'')+'">'+n+'</i>':'')+'</button>';
        }).join('')+'</div>'+
        '<div class="ee-hours" role="group" aria-label="Heure, '+esc(j.libelle)+'">'+j.heures.map(function(x){
          var on=choisis.indexOf(x.debut)>=0;
          return '<button type="button" class="ee-hour" data-rdv-h="'+esc(x.debut)+'" aria-pressed="'+on+'"'+(!on&&choisis.length>=3?' disabled':'')+'>'+esc(x.h)+'</button>';
        }).join('')+'</div>'+
        '<ul class="ee-sel" aria-label="Créneaux choisis">'+choisis.slice().sort().map(function(c){return '<li><span>'+esc(quand(c))+'</span><button type="button" data-rdv-retirer="'+esc(c)+'" aria-label="Retirer '+esc(quand(c))+'">Retirer</button></li>';}).join('')+'</ul>'+
        '<p class="ee-err" role="alert" hidden></p>'+
        '<div class="ee-nav"><button type="button" class="btn" data-rdv-fermer>Annuler</button><button type="button" class="btn btn-primary" data-rdv-envoyer'+(choisis.length?'':' disabled')+'>'+(choisis.length>1?'Envoyer mes '+choisis.length+' créneaux':choisis.length?'Envoyer ce créneau':'Choisissez un créneau')+' <span class="arw">→</span></button></div>';
    }
    var idAide='ee-rdv-aide-'+String(o.demande);
    function ouvrir(){
      ouvert=true; choisis=[]; dessiner();
      if(jours)return;
      api('/creneaux').then(function(d){ jours=(d&&d.jours)||[]; if(d&&d.rdv_url&&!o.rdvUrl)o.rdvUrl=d.rdv_url; dessiner(); });
    }
    racine.addEventListener('click',function(e){
      var t=e.target.closest('button,a'); if(!t||!racine.contains(t))return;
      if(t.hasAttribute('data-rdv-agenda')){ api('/visite',{body:{demande:o.demande,agenda:true}}); return; }
      if(t.hasAttribute('data-rdv-ouvrir')){ ouvrir(); return; }
      if(t.hasAttribute('data-rdv-fermer')){ ouvert=false; dessiner(); return; }
      if(t.hasAttribute('data-rdv-jour')){ jourOuvert=+t.getAttribute('data-rdv-jour'); dessiner(); var b=racine.querySelector('[data-rdv-jour="'+jourOuvert+'"]'); if(b)b.focus({preventScroll:true}); return; }
      if(t.hasAttribute('data-rdv-h')){ var c=t.getAttribute('data-rdv-h'), i=choisis.indexOf(c); if(i>=0)choisis.splice(i,1); else if(choisis.length<3)choisis.push(c); dessiner(); var b2=racine.querySelector('[data-rdv-h="'+c+'"]'); if(b2)b2.focus({preventScroll:true}); return; }
      if(t.hasAttribute('data-rdv-retirer')){ var r=choisis.indexOf(t.getAttribute('data-rdv-retirer')); if(r>=0)choisis.splice(r,1); dessiner(); return; }
      if(t.hasAttribute('data-rdv-envoyer')){
        if(!choisis.length)return;
        t.disabled=true;
        api('/visite',{body:{demande:o.demande,creneaux:choisis,deplacer:!!fixee()}}).then(function(d){
          if(d._status===201){ v=d.visite; ouvert=false; dessiner(); if(o.onChange)o.onChange(d); racine.scrollIntoView({block:'nearest',behavior:'smooth'}); return; }
          t.disabled=false;
          var m=racine.querySelector('.ee-err');
          if(d.error==='champs'&&d.champ==='creneaux'){ jours=null; choisis=[]; ouvrir(); m=null; }
          if(m){ m.textContent=d.error==='connexion'?'Votre session a expiré : ouvrez votre espace pour choisir votre créneau.':d.error==='visite_close'?'Ce dossier a avancé : appelez '+CONF.conseiller+' au '+CONF.telAffiche+' pour convenir d\'une date.':message(d); m.hidden=false; }
        });
      }
    });
    dessiner();
    return {ouvrir:ouvrir};
  }

  /* Charge un script du site une seule fois (le fabricant de PDF de l'avis de valeur, par exemple). */
  var scripts={};
  function script(src){
    if(!scripts[src])scripts[src]=new Promise(function(ok,ko){var s=document.createElement('script');s.src=src;s.onload=function(){ok();};s.onerror=function(){delete scripts[src];ko(new Error('script'));};document.head.appendChild(s);});
    return scripts[src];
  }

  return {MSG:MSG,confirmer:confirmer,occupe:occupe,retarder:retarder,telecharger:telecharger,jourLong:jourLong,quand:quand,quandCourt:quandCourt,heure:heure,visite:visite,script:script,CONF:CONF,$:$,$$:$$,esc:esc,euros:euros,date:date,jour:jour,mois:mois,taille:taille,rayon:rayon,api:api,message:message,messageChamp:messageChamp,resultat:resultat,voirMdp:voirMdp,err:err,emailOk:emailOk,telOk:telOk,connecte:connecte,pictogramme:pictogramme,portraits:portraits,mem:mem,uuid:uuid,TEL:CONF.tel,wa:wa};
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
    $('#ee-contact-sub').textContent='Vérifiez votre numéro : '+EE.CONF.conseiller+' vous rappelle au plus vite pour en parler.';
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
    $('.msg',$('#ee-surface').closest('.field')).textContent=autre?'Indiquez une surface en m², ou laissez vide si vous ne la connaissez pas.':'Indiquez une surface entre 5 et 2 000 m².';
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
  /* Les compteurs partent vides (« – ») : rien n'est prérempli, le vendeur choisit chaque valeur.
     Premier appui : « − » donne le minimum, « + » le minimum plus un. */
  function vide(s){ return s.getAttribute('data-v')===''||s.getAttribute('data-v')==null; }
  function majCompteur(s){
    var o=$('output',s), min=+s.getAttribute('data-min'), max=+s.getAttribute('data-max'), k=s.getAttribute('data-k'), v=+s.getAttribute('data-v');
    if(vide(s)){ o.textContent='–'; o.setAttribute('aria-label','non renseigné'); $$('button',s)[0].disabled=false; $$('button',s)[1].disabled=false; return; }
    o.removeAttribute('aria-label');
    o.textContent=(k==='etage'&&v===0)?'RDC':v; $$('button',s)[0].disabled=v<=min; $$('button',s)[1].disabled=v>=max;
  }
  function errCompteur(s,on){ s.classList.toggle('err',!!on); return !on; }
  $$('.ee-stp',form).forEach(function(s){
    var min=+s.getAttribute('data-min'), max=+s.getAttribute('data-max'), k=s.getAttribute('data-k'), nom=$('.l',s).firstChild.textContent;
    $$('button',s)[0].setAttribute('aria-label',nom+' : moins'); $$('button',s)[1].setAttribute('aria-label',nom+' : plus');
    $$('button',s).forEach(function(b){b.addEventListener('click',function(){var d=+b.getAttribute('data-d');var v=vide(s)?(d<0?min:Math.min(max,min+1)):Math.max(min,Math.min(max,+s.getAttribute('data-v')+d));s.setAttribute('data-v',v);majCompteur(s);errCompteur(s,false);
      if(k==='niveaux'){var pp=form.querySelector('input[name=plain_pied]');if(pp)pp.checked=(v===1);}
      memoriser();
    });});
    majCompteur(s);
  });
  function stp(k){return form.querySelector('.ee-stp[data-k="'+k+'"]');}
  function val(k){var s=stp(k);return s&&!vide(s)?+s.getAttribute('data-v'):null;}
  function fixer(k,v){var s=stp(k);if(s){s.setAttribute('data-v',v==null||v===''?'':v);majCompteur(s);}}
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
      if(R.type==='autre'){ ok2=err(s,s.validity.badInput||(v!==''&&!(+v>=1&&+v<=100000))); return ok2; }
      ok2=err(s,!(+v>=5&&+v<=2000))&&ok2;
      // compteurs visibles : un choix est obligatoire
      $$('.ee-stp',form).forEach(function(c){ if(!c.hidden)ok2=errCompteur(c,vide(c))&&ok2; else errCompteur(c,false); });
      if(R.type==='maison'){var t2=$('#ee-terrain');ok2=err(t2,t2.value.trim()===''||!(+t2.value>=0&&+t2.value<=1000000))&&ok2;}
      ok2=err($('[data-choix=epoque]',form),!R.epoque)&&ok2;
      ok2=err($('[data-choix=etat]',form),!R.etat)&&ok2;
      if(ok2){
        if(R.type==='appartement'&&val('etage')>val('etages_immeuble'))fixer('etages_immeuble',val('etage'));
        if(val('chambres')>=val('pieces')&&val('pieces')>1)fixer('chambres',val('pieces')-1);
        if(val('pieces')===1&&val('chambres')>1)fixer('chambres',1);
      }
      if(!ok2){var f=steps.bien.querySelector('.field.err,.ee-stp.err');if(f){f.scrollIntoView({block:'center',behavior:'smooth'});var c=f.querySelector('input,button');if(c)c.focus({preventScroll:true});}}
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
  function bouton(actif){ var b=$('#ee-submit'); b.disabled=!actif; b.setAttribute('aria-busy',String(!actif)); $('#ee-submit-txt').textContent=actif?'Connaître le prix de mon bien':'Calcul en cours…'; }
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
        var etat={resultat:d.resultat,reference:d.reference,adresse:R.adresse,espace:d.espace||{},email:compte?compte.email:mail.value.trim(),mdp:false,demande:d.demande_id||null,visite:null};
        memoriser(etat);
        montrer(etat,true);
        try{ if(window.beTracker)window.beTracker.t({hash:'33710f67a0c16d7cbb94d1b2ba10e7a8'}); }catch(x){}
        try{ if(window.oaiLead)window.oaiLead(d.reference); }catch(x){}
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
    rdv(etat);
    EE.pictogramme();
    if(defiler){ window.scrollTo({top:res.getBoundingClientRect().top+window.scrollY-90,behavior:'smooth'}); res.focus({preventScroll:true}); }
  }
  /* La visite d'estimation, proposée dès le résultat (si l'espace est ouvert : sinon elle se choisit dans l'espace). */
  function rdv(etat){
    var z=$('#ee-rdv'); z.hidden=true;
    if(!etat.demande||!(etat.espace||{}).connecte)return;
    EE.visite(z,{demande:etat.demande,visite:etat.visite||null,possible:true,email:(etat.espace||{}).lien==='envoye',onChange:function(r){
      etat.visite=r.visite; var m=EE.mem.lire(CLE_MEM); if(m&&m.fini){m.fini.visite=r.visite;EE.mem.ecrire(CLE_MEM,m);}
    }});
  }
  function apres(etat){
    var e=etat.espace||{}, box=$('#ee-apres'), titre=$('#ee-apres-titre'), txt=$('#ee-apres-txt'), f=$('#ee-mdp-form'), lien=$('#ee-apres-espace');
    var mail='<b>'+EE.esc(etat.email||'')+'</b>';
    box.hidden=false; f.hidden=true; lien.hidden=false; lien.href=EE.CONF.espace;
    if(e.connecte){
      titre.innerHTML='Retrouvez-la <em>quand vous voulez.</em>';
      if(e.nouveau){
        txt.innerHTML='Votre espace est créé avec '+mail+' : cette estimation y est rangée, avec l\'avancement de votre dossier.'+(e.lien==='envoye'?' Un e-mail vient de partir avec votre estimation et un lien pour y revenir.':' Gardez cette page ou choisissez un mot de passe pour revenir.');
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
    $$('.ee-stp',form).forEach(function(s){m.compteurs[s.getAttribute('data-k')]=vide(s)?null:+s.getAttribute('data-v');});
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
    $$('.field.err,.ee-stp.err',form).forEach(function(f){f.classList.remove('err');}); $('#ee-type-msg').hidden=true; $('#ee-type-msg').style.display='';
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
/* /mon-espace/ : connexion (lien reçu par e-mail ou mot de passe), estimations, avancement, avis de valeur, photos et documents ;
   après le mandat : offres, comptes rendus de visite, notaire, documents de la vente */
(function(){
  'use strict';
  var $=EE.$, $$=EE.$$, err=EE.err, C=EE.CONF;
  var out=$('#me-out'), inn=$('#me-in'), load=$('#me-load');
  var qs=new URLSearchParams(location.search);
  // Les liens reçus (?lien=…, ?reinit=…) sont retirés de l'adresse tout de suite : ils ne restent ni dans
  // l'historique, ni sur une capture d'écran, ni dans un favori. La page les garde en mémoire le temps de servir.
  var jetonLien=qs.get('lien')||'', jetonReinit=qs.get('reinit')||'';
  if(jetonLien||jetonReinit){ var qp=new URLSearchParams(location.search); qp.delete('lien'); qp.delete('reinit'); try{history.replaceState(null,'',location.pathname+(qp.toString()?'?'+qp.toString():''));}catch(e){} }
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
  var RDV_URL=null, DOSSIERS={};
  /* Avancement : les dix étapes du dossier, celle en cours, et la prochaine (dite par l'agence). */
  function suivi(d){
    var p=d.parcours||[], n=p.length||10, k=0;
    p.forEach(function(e,i){ if(e.etat==='encours'||e.etat==='fait')k=i; });
    var enCours=p[k]||{libelle:d.statut_libelle}, sorti=d.statut==='pause'||d.statut==='close';
    return '<div class="ee-suivi" data-test="suivi">'+
      '<p class="ee-etape"><span>'+(sorti?EE.esc(d.statut_libelle):'Étape '+(k+1)+' sur '+n)+'</span><b data-test="etape">'+EE.esc(enCours.libelle||'')+'</b></p>'+
      '<div class="ee-bar" role="img" aria-label="Étape '+(k+1)+' sur '+n+' : '+EE.esc(enCours.libelle||'')+'">'+p.map(function(e){return '<i class="'+e.etat+'"></i>';}).join('')+'</div>'+
      (d.suite?'<p class="ee-suite" data-test="suite"><b>'+(d.statut==='acte'||sorti?'':'Prochaine étape : ')+'</b>'+EE.esc(d.suite)+'</p>':'')+
      '<details class="ee-frise"><summary>Voir toutes les étapes</summary><ol>'+p.map(function(e){
        return '<li class="'+e.etat+'"'+(e.etat==='encours'?' aria-current="step"':'')+'><span>'+EE.esc(e.libelle)+'</span>'+(e.etat!=='avenir'&&e.le?'<small>'+EE.jour(e.le)+'</small>':'')+'</li>';
      }).join('')+'</ol></details>'+
    '</div>';
  }
  var TYPES={appartement:'Appartement',maison:'Maison',autre:'Bien'};
  function lienFichier(f){return C.api+'/fichier?id='+encodeURIComponent(f.id);}
  function fichier(f){
    var img=/^image\/(jpeg|png|webp)$/.test(f.type);
    return '<li data-fid="'+EE.esc(f.id)+'">'+
      '<a href="'+lienFichier(f)+'"'+(img?' target="_blank" rel="noopener"':' download="'+EE.esc(f.nom)+'"')+'>'+(img?'<img src="'+lienFichier(f)+'" alt="" loading="lazy" width="56" height="56">':'<i aria-hidden="true">'+(f.type==='application/pdf'?'PDF':'DOC')+'</i>')+
      '<span><b>'+EE.esc(f.libelle||f.nom)+'</b><small>'+(f.libelle?EE.esc(f.nom)+' · ':'')+EE.taille(f.taille)+(f.depose_par==='agence'?' · déposé par '+EE.esc(C.conseiller)+(f.cree_le?' le '+EE.jour(f.cree_le):''):'')+'</small></span></a>'+
      (f.depose_par==='client'?'<button type="button" data-suppr="'+EE.esc(f.id)+'" aria-label="Retirer '+EE.esc(f.nom)+'">Retirer</button>':'')+'</li>';
  }
  /* ---------- après le mandat : offres, comptes rendus de visite, notaire (affichés dès qu'il y a quelque chose) ---------- */
  function partOffres(d){
    var l=d.offres||[]; if(!l.length)return '';
    return '<div class="ee-part" data-test="offres"><h4>'+(l.length>1?'Offres reçues':'Offre reçue')+'</h4><ul class="ee-items">'+l.map(function(o){
      return '<li><p class="t"><b class="prix">'+EE.euros(o.montant)+'</b><span class="tag'+(o.statut==='acceptee'?' ok':o.statut==='etude'?' att':'')+'">'+EE.esc(o.statut_libelle)+'</span></p><p class="meta">Reçue le '+EE.jour(o.recue_le)+'</p>'+(o.conditions?'<p class="txt">'+EE.esc(o.conditions)+'</p>':'')+'</li>';
    }).join('')+'</ul></div>';
  }
  function partComptesRendus(d){
    var l=d.comptes_rendus||[]; if(!l.length)return '';
    function un(c){ return '<li><p class="t"><b>Visite du '+EE.esc(EE.jourLong(c.visite_le))+'</b></p><p class="txt">'+EE.esc(c.texte)+'</p></li>'; }
    return '<div class="ee-part" data-test="comptes-rendus"><h4>Comptes rendus de visite <small>'+l.length+'</small></h4><ul class="ee-items">'+l.slice(0,3).map(un).join('')+'</ul>'+
      (l.length>3?'<details class="ee-frise"><summary>Voir les '+(l.length-3>1?(l.length-3)+' comptes rendus précédents':'le compte rendu précédent')+'</summary><ul class="ee-items">'+l.slice(3).map(un).join('')+'</ul></details>':'')+'</div>';
  }
  function partNotaire(d){
    var n=d.notaire; if(!n)return '';
    return '<div class="ee-part" data-test="notaire"><h4>Chez le notaire</h4>'+
      (n.nom||n.coordonnees?'<p class="ee-notaire">'+(n.nom?'<b>'+EE.esc(n.nom)+'</b>':'')+(n.coordonnees?'<span>'+EE.esc(n.coordonnees)+'</span>':'')+'</p>':'')+
      '<div class="ee-frise"><ol>'+(n.etapes||[]).map(function(e){
        return '<li class="'+(e.fait?'fait':'avenir')+'"><span>'+EE.esc(e.libelle)+'</span>'+(e.le?'<small>'+(e.fait?'le ':'prévu le ')+EE.jour(e.le)+'</small>':e.fait?'<small>fait</small>':'')+'</li>';
      }).join('')+'</ol></div></div>';
  }
  function carte(d){
    var rang=(d.parcours||[]).filter(function(e){return e.etat!=='avenir';}).length-1;
    DOSSIERS[d.id]=d;
    var titre=(TYPES[d.type]||'Bien')+(d.surface?' · '+d.surface+' m²':'')+(d.pieces?' · '+d.pieces+' p.':'');
    var avis=(d.fichiers||[]).filter(function(f){return f.role==='avis';}), autres=(d.fichiers||[]).filter(function(f){return f.role!=='avis'&&f.depose_par!=='agence';});
    var docs=(d.fichiers||[]).filter(function(f){return f.role!=='avis'&&f.depose_par==='agence';});
    return '<article class="ee-card" data-id="'+d.id+'">'+
      '<div><h3>'+EE.esc(titre)+'</h3><p class="meta">'+EE.esc(d.adresse||d.commune||'')+'</p></div>'+
      (d.prix_bas?'<div><p class="fp">'+EE.euros(d.prix_bas)+' – '+EE.euros(d.prix_haut)+'</p><p class="meta">Environ '+EE.euros(d.prix_m2)+'/m² · '+d.comparables+' ventes comparables'+(d.rayon?' à moins de '+EE.rayon(d.rayon):'')+(d.donnees_du?' · données à jour de '+EE.mois(d.donnees_du):'')+' · indicatif, à confirmer par une visite</p></div>'
        :d.origine==='agence'?'<div data-test="dossier-agence"><p class="fp fp-txt">Votre dossier</p><p class="meta">'+EE.esc(C.conseiller)+' le suit avec vous, étape par étape. Tout ce qui concerne votre vente arrive ici.</p></div>'
        :'<div><p class="fp fp-txt">Étude personnalisée</p><p class="meta">'+EE.esc(C.conseiller)+' étudie votre bien lui-même et vous rappelle.</p></div>')+
      suivi(d)+
      '<div class="ee-rdv" data-rdv="'+d.id+'" hidden></div>'+
      (avis.length?'<div class="ee-avis">'+avis.map(function(f){return '<a class="btn btn-primary" href="'+lienFichier(f)+'" download="'+EE.esc(f.nom)+'">Télécharger mon avis de valeur (PDF) <span class="arw">↓</span></a>';}).join('')+'</div>'
        :rang>=3&&d.statut!=='close'&&d.statut!=='pause'&&d.origine!=='agence'?'<p class="meta">Votre avis de valeur vous a été remis ; il sera aussi déposé ici.</p>':'')+
      partOffres(d)+partComptesRendus(d)+partNotaire(d)+
      (docs.length?'<div class="ee-part" data-test="documents"><h4>Documents de votre vente</h4><ul class="ee-flist">'+docs.map(fichier).join('')+'</ul></div>':'')+
      '<div class="ee-files"><p class="lab">'+(docs.length?'Vos photos et documents':'Photos et documents')+'</p>'+
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
    // lien « nouveau mot de passe » ouvert alors qu'on est déjà connecté : le formulaire s'affiche quand même
    if(!compte||jetonReinit){
      out.hidden=false; inn.hidden=true;
      etape('email');
      if(qs.get('email')&&!$('#me-email').value)$('#me-email').value=qs.get('email');
      if(jetonReinit)onglet('reinit'); else if(qs.get('oubli'))onglet('oubli'); else onglet('cnx');
      if(qs.get('verifie')==='0')flash('Ce lien de confirmation n\'est plus valable. Connectez-vous pour en recevoir un nouveau.');
      return;
    }
    var c=compte;
    out.hidden=true; inn.hidden=false;
    $('#me-titre').innerHTML=(c.prenom?'Bonjour '+EE.esc(c.prenom)+', <em>voici votre espace.</em>':'Bonjour, <em>voici votre espace.</em>');
    // un dossier ouvert par l'agence (sans estimation en ligne) : on parle de « dossiers »
    var dossiers=d.demandes.some(function(x){return x.origine==='agence';});
    $('#me-lede').textContent=d.demandes.length?(dossiers?'Votre dossier, étape par étape.':'Vos estimations et l\'avancement de chaque dossier.'):'Vous n\'avez pas encore d\'estimation.';
    RDV_URL=d.rdv_url||null; DOSSIERS={};
    $('#me-bonjour').textContent=d.demandes.length+(dossiers?' dossier':' estimation')+(d.demandes.length>1?'s':'');
    $('#me-cards').innerHTML=d.demandes.length?d.demandes.map(carte).join(''):'<div class="ee-empty"><p style="margin:0;">Deux minutes suffisent pour connaître la fourchette de prix de votre bien.</p><a class="btn btn-primary" href="'+C.estimer+'">Estimer mon bien <span class="arw">→</span></a></div>';
    // visite d'estimation : choisir, voir ou déplacer son créneau, dans chaque dossier
    $$('#me-cards [data-rdv]').forEach(function(z){
      var x=DOSSIERS[z.getAttribute('data-rdv')]; if(!x)return;
      EE.visite(z,{demande:x.id,visite:x.visite,possible:!!x.visite_possible,rdvUrl:RDV_URL,email:lienPossible,onChange:function(r){
        x.visite=r.visite; if(r.suite){x.suite=r.suite;var t=$('[data-test=suite]',z.closest('.ee-card'));if(t)t.innerHTML='<b>Prochaine étape : </b>'+EE.esc(r.suite);}
      }});
    });
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

  /* ---------- connexion en deux temps : l'e-mail, puis le mot de passe (s'il y en a un) ou le lien envoyé ---------- */
  var etapeCnx='email', emailCnx='';
  var SOUS={email:'Indiquez l\'e-mail donné le jour de votre estimation.',mdp:'Votre espace est protégé par un mot de passe.',envoye:''};
  function etape(t){
    var f=$('#me-cnx'), b=$('#me-cnx-btn');
    etapeCnx=t; msg(f,'');
    $('#me-email-f').hidden=(t==='envoye');
    $('#me-mdp-f').hidden=(t!=='mdp');
    $('#me-envoye').hidden=(t!=='envoye');
    $('#me-cnx-nav').hidden=(t==='envoye');
    $('#me-lien-btn').hidden=(t!=='mdp');
    $('#me-cnx-sub').textContent=SOUS[t];
    $('#me-cnx-sub').hidden=!SOUS[t];
    b.innerHTML=t==='mdp'?'Me connecter <span class="arw">→</span>':'Continuer <span class="arw">→</span>';
    err($('#me-mdp'),false);
    if(t==='mdp'){ $('#me-mdp').value=''; $('#me-mdp').focus({preventScroll:true}); }
    if(t==='envoye'){ $('#me-envoye-a').textContent=emailCnx.toLowerCase(); }
  }
  function emailSaisi(){ var m=$('#me-email'); m.value=m.value.replace(/\s+/g,''); return err(m,!EE.emailOk(m.value))?m.value:null; }
  var sansEnvoi='L\'envoi de liens par e-mail n\'est pas encore ouvert. Votre espace s\'ouvre avec un lien de connexion : '+aide;
  function lien(b){
    var f=$('#me-cnx');
    if(!emailCnx){ emailCnx=emailSaisi(); if(!emailCnx){$('#me-email').focus();return;} }
    msg(f,''); if(b)b.disabled=true;
    EE.api('/lien',{body:{email:emailCnx,site:C.site||undefined}}).then(function(d){
      if(b)b.disabled=false;
      if(d._status!==200){msg(f,EE.messageChamp(d));return;}
      if(!d.envoye){msg(f,sansEnvoi);return;}
      var deja=etapeCnx==='envoye'; etape('envoye');
      if(deja)msg(f,'Nouveau lien envoyé. Seul le dernier reçu fonctionne.',true);
    });
  }
  $('#me-email').addEventListener('input',function(){ if(etapeCnx==='mdp'&&this.value.replace(/\s+/g,'').toLowerCase()!==emailCnx.toLowerCase())etape('email'); });
  $('#me-lien-btn').addEventListener('click',function(){ emailCnx=emailSaisi()||''; if(!emailCnx){$('#me-email').focus();return;} lien(this); });
  $('#me-renvoi').addEventListener('click',function(){ lien(this); });
  $('#me-autre').addEventListener('click',function(){ emailCnx=''; etape('email'); var m=$('#me-email'); m.focus(); m.select(); });
  $('#me-cnx').addEventListener('submit',function(e){
    e.preventDefault(); var f=this, b=$('#me-cnx-btn');
    var adr=emailSaisi(); if(!adr){$('#me-email').focus();return;}
    emailCnx=adr; msg(f,'');
    if(etapeCnx!=='mdp'){
      b.disabled=true;
      EE.api('/acces',{body:{email:adr,site:C.site||undefined}}).then(function(d){
        b.disabled=false;
        if(d._status!==200){msg(f,EE.messageChamp(d));return;}
        if(d.etape==='mot_de_passe'){etape('mdp');return;}
        if(d.envoye){etape('envoye');return;}
        msg(f,sansEnvoi);
      });
      return;
    }
    if(!err($('#me-mdp'),!$('#me-mdp').value)){$('#me-mdp').focus();return;}
    b.disabled=true;
    EE.api('/connexion',{body:{email:adr,mot_de_passe:$('#me-mdp').value}}).then(function(d){
      b.disabled=false;
      if(d._status===200){ $('#me-mdp').value=''; charger(); window.scrollTo({top:0}); return; }
      if(d.error==='sans_mot_de_passe'){ msg(f,'Cet espace n\'a pas de mot de passe : il s\'ouvre avec un lien. Cliquez sur « Recevoir plutôt un lien par e-mail ».'); return; }
      if(d.error==='identifiants'){ msg(f,'Mot de passe incorrect. Réessayez, ou recevez plutôt un lien par e-mail.'); return; }
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
    e.preventDefault(); var f=this, m=$('#mo-email'), b=$('[type=submit]',f); m.value=m.value.replace(/\s+/g,''); if(!err(m,!EE.emailOk(m.value))){m.focus();return;}
    msg(f,''); EE.occupe(b,true);
    EE.api('/mot-de-passe/oubli',{body:{email:m.value,site:C.site||undefined}}).then(function(d){
      EE.occupe(b,false);
      if(d._status!==200){msg(f,EE.messageChamp(d));return;}
      if(d.envoye)msg(f,'Si un espace existe avec cette adresse, un lien vient d\'y être envoyé (pensez aux indésirables). Il est valable 1 heure.',true);
      else msg(f,'L\'envoi de liens par e-mail n\'est pas encore ouvert. '+aide+' Il vous envoie un lien pour choisir un nouveau mot de passe.');
    });
  });
  /* ---------- nouveau mot de passe (lien reçu) ---------- */
  $('#me-reinit').addEventListener('submit',function(e){
    e.preventDefault(); var f=this, b=$('[type=submit]',f); if(!err($('#mr-mdp'),$('#mr-mdp').value.trim().length<8)){$('#mr-mdp').focus();return;}
    if(!jetonReinit){msg(f,EE.MSG.jeton);return;}
    msg(f,''); EE.occupe(b,true);
    EE.api('/mot-de-passe/reinit',{body:{jeton:jetonReinit,mot_de_passe:$('#mr-mdp').value}}).then(function(d){
      EE.occupe(b,false);
      if(d._status===200){jetonReinit='';$('#mr-mdp').value='';qs=new URLSearchParams();charger().then(function(){var n=$('#me-mdp-ok');n.textContent='Nouveau mot de passe enregistré. Les autres appareils ont été déconnectés.';n.hidden=false;});}
      else if(d.error==='jeton'){jetonReinit='';msg(f,'Ce lien n\'est plus valable (1 heure, une seule fois). Demandez-en un nouveau avec « Mot de passe oublié ? ».');}
      else msg(f,EE.messageChamp(d));
    });
  });

  /* ---------- connecté ---------- */
  /* déconnexion : cet appareil, ou tous les appareils ; si le réseau coupe, on le dit (on ne fait pas croire que c'est fait) */
  function deconnecter(b,partout){
    var e=$('#me-compte-err'); e.hidden=true;
    if(partout&&!EE.confirmer(b,'Confirmer : déconnecter tous mes appareils'))return;
    EE.occupe(b,true);
    EE.api('/deconnexion',{body:partout?{partout:true}:{}}).then(function(d){
      if(d._status===200){location.href=C.espace;return;}
      EE.occupe(b,false); e.textContent=EE.message(d); e.hidden=false;
    });
  }
  $('#me-logout').addEventListener('click',function(){deconnecter(this,false);});
  $('#me-logout-all').addEventListener('click',function(){deconnecter(this,true);});
  /* RGPD : toutes mes données dans un fichier */
  $('#me-export').addEventListener('click',function(){
    var b=this, e=$('#me-compte-err'); e.hidden=true; EE.occupe(b,true,'Préparation du fichier…');
    EE.telecharger('/moi/export','mes-donnees.json').then(function(d){ EE.occupe(b,false); if(d._status!==200&&d.error!=='connexion'){e.textContent=EE.message(d);e.hidden=false;} });
  });
  /* session expirée pendant qu'on était sur la page : retour à la connexion, avec un mot simple */
  window.addEventListener('ee:session',function(){
    if(inn.hidden)return;
    compte=null; inn.hidden=true; out.hidden=false; etape('email'); onglet('cnx'); EE.pictogramme();
    flash('Votre session a expiré : indiquez votre e-mail pour vous reconnecter. Rien n\'est perdu.');
    window.scrollTo({top:0}); $('#me-email').focus({preventScroll:true});
  });
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
    e.preventDefault(); var f=this, b=$('[type=submit]',f);
    if(!$('#md-conf-f').hidden&&$('#md-conf').value.trim().toUpperCase()!=='SUPPRIMER'){err($('#md-conf'),true);$('#md-conf').focus();return;}
    if(!$('#md-mdp-f').hidden&&!$('#md-mdp').value){err($('#md-mdp'),true);$('#md-mdp').focus();return;}
    msg(f,''); EE.occupe(b,true);
    EE.api('/compte/supprimer',{body:{mot_de_passe:$('#md-mdp').value,confirmation:$('#md-conf').value}}).then(function(d){
      EE.occupe(b,false);
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
    var card=input.closest('.ee-card'), zone=$('.ee-files',card), liste=$('.ee-flist',zone), id=input.getAttribute('data-ajout');
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
    if(!EE.confirmer(b,'Confirmer le retrait'))return;
    b.disabled=true;
    EE.api('/fichier/supprimer',{body:{id:b.getAttribute('data-suppr')}}).then(function(d){ if(d._status===200){var li=b.closest('li');li.parentNode.removeChild(li);} else {b.disabled=false;b.removeAttribute('data-ok');b.textContent='Retirer';var z=b.closest('.ee-files');if(z)msg(z,EE.message(d));} });
  });

  /* ---------- arrivée par un lien de connexion (?lien=…) : la page l'échange contre une session ---------- */
  if(jetonLien){
    EE.api('/lien/ouvrir',{body:{jeton:jetonLien}}).then(function(d){
      jetonLien='';
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
/* /admin/ : toutes les demandes des deux sites et tous les comptes ; statut, rappel, notes, fichiers, export CSV ;
   visite d'estimation, avis de valeur ; après le mandat : comptes rendus de visite, offres, documents, notaire ;
   dossier ouvert à la main par l'agence, espace du vendeur (lien à lui envoyer par WhatsApp, SMS ou e-mail) */
(function(){
  'use strict';
  var $=EE.$, $$=EE.$$, C=EE.CONF;
  var D=[], Cp=[], STATUTS={}, TAILLE_MAX=10*1024*1024, MAIL_CLIENTS=false, AVIS={}, SUITE={}, OFFRES={}, DOCS={}, AUJ='';
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
    return '<li data-fid="'+EE.esc(f.id)+'"><a href="'+lienFichier(f)+'" target="_blank" rel="noopener"><i aria-hidden="true">'+(f.role==='avis'?'AVIS':f.type==='application/pdf'?'PDF':'IMG')+'</i><span><b>'+EE.esc(f.nom)+'</b><small>'+EE.taille(f.taille)+' · '+(f.role==='avis'?'avis de valeur, visible par le vendeur':f.role==='brouillon'?'brouillon, invisible pour le vendeur':f.depose_par==='client'?'déposé par le client':(f.libelle?EE.esc(f.libelle)+' · ':'')+'déposé par l\'agence, visible par le vendeur')+' · '+EE.jour(f.cree_le)+'</small></span></a><button type="button" data-fsuppr="'+EE.esc(f.id)+'" aria-label="Retirer '+EE.esc(f.nom)+'">Retirer</button></li>';
  }
  function retard(d){ return !!(d.action&&d.action.retard); }
  function echeance(iso){ if(!iso)return ''; var j=EE.quandCourt(iso); return j; }
  function actionTxt(d){ var a=d.action||{}; if(!a.texte)return ''; return a.texte+(a.echeance?' · '+(a.rdv?'':a.retard?'en retard depuis ':'avant ')+echeance(a.echeance):''); }
  /* bloc « Visite d'estimation » d'un dossier : créneaux proposés par le vendeur, date fixée, agenda */
  function blocVisite(d){
    var v=d.visite, h='<div class="ee-bloc" data-bloc="visite"><p class="lab">Visite d\'estimation</p>';
    if(v&&v.etat==='fixee'&&v.debut){
      h+='<p class="ee-note" data-test="visite-fixee"><b>'+EE.esc(EE.quand(v.debut))+'</b> · '+(v.duree||45)+' min · chez le vendeur</p>'+
        '<div class="acts">'+(v.agenda?'<a class="btn" href="'+EE.esc(v.agenda)+'" target="_blank" rel="noopener" data-test="agenda">Ajouter à mon agenda Google</a>':'')+'<button type="button" class="btn" data-vannuler>Annuler la visite</button></div>';
    } else if(v&&v.etat==='demandee'){
      h+='<p class="hint">Créneaux proposés par le vendeur'+(v.demandee_le?' le '+EE.esc(EE.quandCourt(v.demandee_le)):'')+' : un clic confirme.</p>'+
        '<div class="acts">'+(v.creneaux||[]).map(function(c){return '<button type="button" class="btn btn-primary" data-vfix="'+EE.esc(c)+'">Confirmer '+EE.esc(EE.quandCourt(c))+'</button>';}).join('')+'</div>';
    } else h+='<p class="hint">Aucune visite fixée. Le vendeur peut proposer ses créneaux depuis son espace ; vous pouvez aussi fixer la date convenue au téléphone.</p>';
    h+='<div class="field"><label for="ad-vd-'+d.id+'">'+(v&&v.etat==='fixee'?'Déplacer au':'Autre date (heure de Paris)')+'</label><input type="datetime-local" id="ad-vd-'+d.id+'" data-vdate step="900"></div>'+
      '<label class="ee-check-l"><input type="checkbox" data-vprevenir'+(MAIL_CLIENTS?' checked':' disabled')+'>'+(MAIL_CLIENTS?'Envoyer la confirmation au vendeur par e-mail':'E-mails aux vendeurs pas encore ouverts : prévenez-le par téléphone')+'</label>'+
      '<div class="acts"><button type="button" class="btn" data-vfixdate>Fixer la visite</button></div>'+
      '<p class="ee-err" role="alert" hidden></p><p class="ee-ok" role="status" hidden></p></div>';
    return h;
  }
  function blocAvis(d){
    var a=d.avis;
    return '<div class="ee-bloc" data-bloc="avis"><p class="lab">Avis de valeur</p>'+
      '<p class="hint" data-avis-etat>'+(a&&a.valide_le?'Envoyé au vendeur le '+EE.jour(a.valide_le)+'.':a&&a.prepare_le?'Brouillon commencé le '+EE.jour(a.prepare_le)+'.':'PDF à la charte, avec les ventes réelles du quartier. Vous complétez vos notes, vous validez : il part dans l\'espace du vendeur.')+'</p>'+
      '<div class="acts"><button type="button" class="btn btn-primary" data-avis-ouvrir>'+(a&&a.prepare_le?'Reprendre l\'avis de valeur':'Préparer l\'avis de valeur')+'</button></div>'+
      '<div class="ee-avis-ed" data-avis-ed hidden></div></div>';
  }
  function ligne(d){
    var c=d.contact||{}, nom=[c.civilite,c.prenom,c.nom].filter(Boolean).join(' ');
    var opts=Object.keys(STATUTS).map(function(k){return '<option value="'+k+'"'+(k===d.statut?' selected':'')+'>'+EE.esc(STATUTS[k])+'</option>';}).join('');
    var tel=String(c.telephone||'').replace(/[^\d+]/g,'');
    return '<details class="ee-row" data-id="'+d.id+'"><summary><b>'+EE.esc(nom||c.email)+' · '+EE.esc(d.commune||'')+'</b>'+
      '<span class="st '+d.statut+'">'+EE.esc(STATUTS[d.statut]||d.statut)+'</span>'+
      (actionTxt(d)?'<span class="act'+(retard(d)?' ee-late':'')+'" data-test="action">→ '+EE.esc(actionTxt(d))+'</span>':'')+
      '<small>'+EE.date(d.cree_le)+' · '+EE.esc((d.type==='autre'?'Autre':d.type==='maison'?'Maison':'Appart.')+(d.surface?' '+d.surface+' m²':''))+' · '+(d.prix_bas?EE.euros(d.prix_bas)+' – '+EE.euros(d.prix_haut):origineAgence(d)?'ouvert par l\'agence':'rappel')+' · '+EE.esc(LIB.site[d.site]||d.site||'')+
        (d.rappel_le?' · rappeler avant le '+EE.jour(d.rappel_le):'')+(d.suspect?' · <span class="ee-late">robot possible</span>':'')+(d.test?' · essai':'')+'</small>'+
      '<span class="tr" data-test="trace"'+(d.trace?'':' hidden')+'>'+EE.esc(traceTxt(d.trace))+'</span></summary>'+
      '<div class="in">'+
        '<div class="acts ee-top">'+(tel?'<a class="btn btn-primary" href="tel:'+EE.esc(tel)+'">Appeler '+EE.esc(c.telephone||'')+'</a>':'')+(c.email?'<a class="btn" href="mailto:'+EE.esc(c.email)+'?subject='+encodeURIComponent((origineAgence(d)?'Votre dossier ':'Votre estimation ')+d.reference)+'">E-mail</a>':'')+(tel?'<a class="btn" href="https://wa.me/'+EE.esc(tel.replace(/^\+/,'').replace(/^0/,'33'))+'" target="_blank" rel="noopener">WhatsApp</a>':'')+'</div>'+
      '<div class="ee-col">'+
        blocEspace(d)+
        blocVisite(d)+
        '<div class="field"><label for="ad-st-'+d.id+'">Statut</label><select id="ad-st-'+d.id+'" data-f="statut">'+opts+'</select></div>'+
        '<label class="ee-check-l" data-prevenir-l><input type="checkbox" data-f="prevenir"'+(MAIL_CLIENTS?' checked':' disabled')+'>'+(MAIL_CLIENTS?'Annoncer le changement de statut au vendeur par e-mail':'E-mails aux vendeurs pas encore ouverts : rien ne part')+'</label>'+
        '<div class="field" data-raison-f'+(d.statut==='pause'||d.statut==='close'?'':' hidden')+'><label for="ad-ra-'+d.id+'">Raison (pas maintenant, perdu)</label><input type="text" id="ad-ra-'+d.id+'" data-f="raison" maxlength="300" value="'+EE.esc(d.raison||'')+'"></div>'+
        '<div class="field"><label for="ad-rp-'+d.id+'">Rappeler avant le</label><input type="date" id="ad-rp-'+d.id+'" data-f="rappel_le" value="'+EE.esc(d.rappel_le||'')+'"></div>'+
        '<div class="field"><label for="ad-no-'+d.id+'">Notes (visibles par l\'agence seulement)</label><textarea id="ad-no-'+d.id+'" data-f="notes" maxlength="5000">'+EE.esc(d.notes||'')+'</textarea></div>'+
        '<div class="acts"><button type="button" class="btn btn-primary" data-save>Enregistrer</button><span class="saved" role="status" hidden>Enregistré</span></div>'+
        blocAvis(d)+
        '<div class="ee-suite" data-suite></div>'+
        '<div class="ee-files"><p class="lab">Fichiers du dossier</p><ul class="ee-flist">'+(d.fichiers||[]).map(fichier).join('')+'</ul>'+
          '<div class="acts"><label class="btn ee-add"><input type="file" accept="application/pdf" data-depot="avis">Déposer un avis de valeur fait ailleurs (PDF)</label><label class="btn ee-add"><input type="file" multiple accept="image/jpeg,image/png,image/webp,image/heic,image/heif,application/pdf" data-depot="document">Ajouter un document</label></div>'+
          '<div class="field"><label for="ad-dn-'+d.id+'">Nature du prochain document</label><select id="ad-dn-'+d.id+'" data-doc-nature><option value="">Document</option>'+Object.keys(DOCS).map(function(k){return '<option value="'+k+'">'+EE.esc(DOCS[k])+'</option>';}).join('')+'</select></div>'+
          '<p class="hint">Le vendeur voit l\'avis de valeur et les documents dans son espace (mandat, diagnostics, compromis…). 10 Mo au plus par fichier.</p><p class="ee-err" role="alert" hidden></p><p class="ee-ok" role="status" hidden></p></div>'+
        '<details class="ee-journal" data-journal><summary>Journal du dossier</summary><ul></ul></details>'+
        '<div class="ee-links">'+(d.suspect?'<button type="button" data-humain>Ce n\'est pas un robot</button>':'')+'<button type="button" class="ee-danger" data-dsuppr>Supprimer cette demande</button></div>'+
      '</div>'+
        '<div class="ee-fiche"><ul class="ee-kv">'+[['Référence',d.reference],['Site',LIB.site[d.site]||d.site],['E-mail',c.email],['Fourchette',d.prix_bas?EE.euros(d.prix_bas)+' – '+EE.euros(d.prix_haut)+' ('+EE.euros(d.prix_m2)+'/m², '+d.comparables+' ventes'+(d.rayon?' à moins de '+EE.rayon(d.rayon):'')+')':'Pas de fourchette : rappel promis au plus vite']].concat(fiche(d.reponses||{})).concat(d.en_attente?[['Espace client','en attente de confirmation de l\'e-mail']]:[]).map(function(l){return '<li><span>'+EE.esc(l[0])+'</span><span>'+EE.esc(l[1])+'</span></li>';}).join('')+'</ul>'+'</div>'+
      '</div></details>';
  }
  /* ---------- tableau de bord : vues rapides, recherche, filtres, pages de 40 dossiers ---------- */
  var RAPIDES={
    '':['Dossiers',function(){return true;}],
    retard:['Actions en retard',retard],
    visites:['Visites à confirmer',function(d){return d.visite&&d.visite.etat==='demandee';}],
    prevues:['Visites prévues',function(d){return d.statut==='visite';}],
    nouvelles:['Nouvelles demandes',function(d){return d.statut==='recue';}],
    rappels:['À rappeler',function(d){return !!d.rappel_le&&d.rappel_le<=AUJ&&d.statut!=='close'&&d.statut!=='acte';}]
  };
  var RAPIDE='', PAGE=40, MONTRES=PAGE, CLE_FILTRES='ee-admin-filtres';
  function filtres(){ return {q:$('#ad-q').value.trim().toLowerCase(),s:$('#ad-statut').value,site:$('#ad-site').value,essais:$('#ad-essais').checked,rapide:RAPIDE}; }
  function garderFiltres(){ var f=filtres(); EE.mem.ecrire(CLE_FILTRES,{q:$('#ad-q').value,s:f.s,site:f.site,essais:f.essais,rapide:f.rapide}); }
  function cherche(d,q){ var c=d.contact||{}; return [c.prenom,c.nom,c.email,c.telephone,String(c.telephone||'').replace(/\D/g,''),d.commune,d.adresse,d.reference,d.site,d.compte_email].join(' ').toLowerCase().indexOf(q)>=0; }
  function filtrer(garderPage){
    var f=filtres();
    if(!garderPage)MONTRES=PAGE;
    var ouvertes=$$('#ad-rows details[open]').map(function(x){return x.getAttribute('data-id');});
    var test=(RAPIDES[f.rapide]||RAPIDES[''])[1];
    var l=D.filter(function(d){ if(f.s&&d.statut!==f.s)return false; if(f.site&&d.site!==f.site)return false; if(f.essais&&d.test)return false; if(!test(d))return false; return !f.q||cherche(d,f.q); });
    // les actions en retard en haut (la plus ancienne d'abord), puis le reste, du plus récent au plus ancien
    l=l.slice().sort(function(a,b){ var ra=retard(a), rb=retard(b); if(ra!==rb)return ra?-1:1; if(ra)return String(a.action.echeance)<String(b.action.echeance)?-1:1; return String(a.cree_le)<String(b.cree_le)?1:-1; });
    // un dossier ouvert reste affiché même au-delà de la page (on ne perd pas ce qu'on était en train de faire)
    var vus=l.slice(0,MONTRES); l.slice(MONTRES).forEach(function(d){ if(ouvertes.indexOf(String(d.id))>=0)vus.push(d); });
    $('#ad-rows').innerHTML=vus.length?vus.map(ligneDossier).join(''):'<div class="ee-empty">Aucune demande'+(f.q||f.s||f.site||f.rapide?' avec ces filtres. <button type="button" class="ee-skip" data-tout-voir>Tout afficher</button>':'.')+'</div>';
    ouvertes.forEach(function(id){var x=$('#ad-rows details[data-id="'+id+'"]');if(x)x.open=true;});
    if(l.length===1)$('#ad-rows details').open=true;
    $('#ad-nb').textContent=l.length===D.length?(D.length+' dossier'+(D.length>1?'s':'')):(l.length+' dossier'+(l.length>1?'s':'')+' sur '+D.length);
    var reste=l.length-vus.length; $('#ad-plus').hidden=reste<=0; if(reste>0)$('#ad-plus').textContent='Afficher '+Math.min(reste,PAGE)+' dossiers de plus ('+reste+' restants)';
    $('#ad-export').href=C.api+'/admin/export.csv?quoi=demandes'+(f.site?'&site='+f.site:'')+(f.s?'&statut='+f.s:'');
    garderFiltres();
  }
  function stats(){
    $('#ad-stats').innerHTML=['','retard','visites','prevues','nouvelles','rappels'].map(function(k){
      var r=RAPIDES[k], n=k?D.filter(r[1]).length:D.length;
      return '<button type="button" class="ee-stat'+(k==='retard'&&n?' ee-stat-alerte':'')+'" data-rapide="'+k+'" aria-pressed="'+(RAPIDE===k)+'"><b>'+n+'</b><span>'+r[0]+'</span></button>';
    }).join('');
  }
  $('#ad-stats').addEventListener('click',function(e){
    var b=e.target.closest('[data-rapide]'); if(!b)return;
    var k=b.getAttribute('data-rapide'); RAPIDE=(RAPIDE===k&&k)?'':k;
    stats(); filtrer(); var x=$('#ad-stats [data-rapide="'+RAPIDE+'"]'); if(x)x.focus({preventScroll:true});
  });
  $('#ad-plus').addEventListener('click',function(){ MONTRES+=PAGE; filtrer(true); });
  $('#ad-rows').addEventListener('click',function(e){
    if(!e.target.closest('[data-tout-voir]'))return;
    $('#ad-q').value=''; $('#ad-statut').value=''; $('#ad-site').value=''; RAPIDE=''; stats(); filtrer(); $('#ad-q').focus();
  });
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
        // déjà affiché (bouton Actualiser, réseau coupé) : on garde la liste à l'écran et on dit ce qui se passe
        if(!$('#ad-in').hidden&&r[0]._status!==401&&r[0]._status!==403){ var ae=$('#ad-err'); ae.textContent='Actualisation impossible : '+EE.message(r[0]); ae.hidden=false; return; }
        $('#ad-no').hidden=false; $('#ad-in').hidden=true;
        $('#ad-no-compte').hidden=!(r[0]._status===403);
        if(r[0].error==='admin_non_verifie')$('#ad-no-txt').textContent='Votre adresse doit être confirmée avant d\'ouvrir l\'espace agence : demandez votre lien de connexion ci-dessous et ouvrez-le depuis votre boîte e-mail.';
        else if(r[0].error==='interdit')$('#ad-no-txt').textContent='Ce compte n\'a pas accès à l\'espace agence. Déconnectez-vous, puis demandez le lien avec l\'adresse de l\'agence.';
        else if(r[0]._status!==401&&r[0]._status!==403)$('#ad-no-txt').textContent=EE.message(r[0]);
        return;
      }
      $('#ad-err').hidden=true;
      $('#ad-maj').textContent='Mis à jour à '+EE.heure(new Date().toISOString());
      STATUTS=r[0].statuts; D=r[0].demandes; Cp=r[1].comptes||[]; if(r[0].taille_max)TAILLE_MAX=r[0].taille_max; MAIL_CLIENTS=!!r[0].email_clients;
      OFFRES=r[0].statuts_offre||{}; DOCS=r[0].documents||{}; AUJ=r[0].aujourdhui||new Date().toISOString().slice(0,10); SUITE={};
      var ru=$('#ad-rdv-url'); if(ru&&document.activeElement!==ru)ru.value=r[0].rdv_url||'';
      var ie=$('#ad-ics-out'); if(ie&&ie.hidden&&r[0].agenda_relie){ie.hidden=false;ie.className='ee-ok';ie.textContent='Agenda Google relié : les moments pris dans votre agenda ne sont pas proposés aux vendeurs.';}
      var s=$('#ad-statut'), v=s.value||s.getAttribute('data-garde')||''; s.removeAttribute('data-garde');
      s.innerHTML='<option value="">Tous les statuts</option>'+Object.keys(STATUTS).map(function(k){return '<option value="'+k+'">'+EE.esc(STATUTS[k])+'</option>';}).join(''); s.value=v;
      $('#ad-in').hidden=false; stats(); filtrer(); comptes();
    });
  }
  var filtrerTard=EE.retarder(function(){filtrer();},160);
  $('#ad-q').addEventListener('input',filtrerTard); $('#ad-statut').addEventListener('change',function(){filtrer();}); $('#ad-site').addEventListener('change',function(){filtrer();}); $('#ad-essais').addEventListener('change',function(){filtrer();}); $('#ad-qc').addEventListener('input',EE.retarder(comptes,160));
  // « / » place le curseur dans la recherche (comme sur la plupart des outils), sauf pendant une saisie
  document.addEventListener('keydown',function(e){ if(e.key!=='/'||e.ctrlKey||e.metaKey||e.altKey)return; var t=e.target; if(t&&(/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)||t.isContentEditable))return; if($('#ad-in').hidden||$('#ad-demandes').hidden)return; e.preventDefault(); $('#ad-q').focus(); });
  // filtres de la dernière visite (dans cet onglet)
  (function(){ var m=EE.mem.lire(CLE_FILTRES); if(!m)return; $('#ad-q').value=m.q||''; $('#ad-site').value=m.site||''; $('#ad-essais').checked=!!m.essais; RAPIDE=RAPIDES[m.rapide]?m.rapide:''; $('#ad-statut').setAttribute('data-garde',m.s||''); })();
  /* modifications pas encore enregistrées (statut, notes, rappel, raison) : la page prévient avant de les perdre */
  function sale(){ return $$('#ad-rows .ee-row[data-sale]').length>0; }
  $('#ad-rows').addEventListener('input',function(e){ var f=e.target.closest('[data-f]'); if(!f||f.getAttribute('data-f')==='prevenir')return; var row=f.closest('.ee-row'); row.setAttribute('data-sale','1'); var s=$('.saved',row); if(s){s.hidden=false;s.style.color='';s.textContent='Modifications non enregistrées';} });
  window.addEventListener('beforeunload',function(e){ if(sale()){e.preventDefault();e.returnValue='';} });
  $('#ad-actualiser').addEventListener('click',function(){
    var b=this;
    if(sale()&&!EE.confirmer(b,'Des notes ne sont pas enregistrées : actualiser quand même ?'))return;
    EE.occupe(b,true,'Actualisation…'); charger().then(function(){EE.occupe(b,false);});
  });
  function sortir(b){
    if(sale()&&!EE.confirmer(b,'Des notes ne sont pas enregistrées : me déconnecter quand même ?'))return;
    EE.occupe(b,true);
    EE.api('/deconnexion',{body:{}}).then(function(d){
      EE.occupe(b,false);
      if(d._status!==200){var ae=$('#ad-err');ae.textContent='Déconnexion impossible : '+EE.message(d);ae.hidden=false;return;}
      $$('#ad-rows .ee-row[data-sale]').forEach(function(x){x.removeAttribute('data-sale');});
      location.href=C.admin;
    });
  }
  $('#ad-sortir').addEventListener('click',function(){sortir(this);});
  $('#ad-no-sortir').addEventListener('click',function(){sortir(this);});
  /* session expirée pendant le travail (7 jours sans visite, ou déconnexion depuis un autre appareil) */
  window.addEventListener('ee:session',function(){
    if($('#ad-in').hidden)return;
    $('#ad-in').hidden=true; $('#ad-no').hidden=false; $('#ad-no-compte').hidden=true;
    $('#ad-no-txt').textContent='Votre session a expiré. Demandez un nouveau lien de connexion : la page se rouvrira où vous étiez (les notes non enregistrées sont à ressaisir).';
    EE.pictogramme(); window.scrollTo({top:0}); $('#ad-email').focus({preventScroll:true});
  });
  /* mesures par bien (onglet « Biens ») : /api/espace/admin/mesures-biens, sans cookie côté visiteur */
  function mesuresBiens(){
    var b=$('#ad-mb-btn'), z=$('#ad-mb'); EE.occupe(b,true);
    EE.api('/admin/mesures-biens').then(function(d){
      EE.occupe(b,false); z.dataset.lu='1';
      if(d._status!==200){z.innerHTML='<p class="ee-err">'+EE.esc(EE.message(d))+'</p>';return;}
      var pl=function(n,un,plus){return n+' '+(n>1?plus:un);};
      z.innerHTML=d.biens.length?'<ul class="ee-kv">'+d.biens.map(function(x){
        return '<li><span>Réf. '+EE.esc(x.ref)+'</span><span>'+[pl(x.vue,'vue','vues'),pl(x.visiter,'clic « Visiter »','clics « Visiter »'),pl(x.rdv,'visite réservée','visites réservées'),pl(x.video,'vidéo regardée','vidéos regardées'),pl(x.whatsapp,'WhatsApp','WhatsApp'),pl(x.appel,'appel','appels')].join(' · ')+'</span></li>';
      }).join('')+'</ul>':'<p class="hint">Rien pour le moment : les compteurs démarrent avec la mise en ligne des fiches mesurées.</p>';
    });
  }
  $('#ad-mb-btn').addEventListener('click',mesuresBiens);
  /* journal de l'agence (Réglages) */
  var ACTIONS_AGENCE={export:'Export CSV',demande_supprimee:'Demande supprimée',compte_supprime:'Compte supprimé',lien_fabrique:'Lien de connexion fabriqué',cle_flux:'Nouvelle clé Google Sheet',reglages:'Réglages modifiés',deconnexion_partout:'Déconnexion de tous les appareils'};
  $('#ad-ja-btn').addEventListener('click',function(){
    var b=this, z=$('#ad-ja'); EE.occupe(b,true);
    EE.api('/admin/journal-agence').then(function(d){
      EE.occupe(b,false); z.hidden=false;
      if(d._status!==200){z.innerHTML='<p class="ee-err">'+EE.esc(EE.message(d))+'</p>';return;}
      if(!d.actif){z.innerHTML='<p class="hint">Le journal n\'est pas encore activé sur ce site : il démarre dès que la mise à jour de la base (fichier 2026-10-18-admin.sql) est appliquée.</p>';return;}
      z.innerHTML=d.journal.length?'<ul class="ee-kv ee-ja">'+d.journal.map(function(l){var x=l.detail||{};return '<li><span>'+EE.esc(EE.quandCourt(l.cree_le))+'</span><span>'+EE.esc((ACTIONS_AGENCE[l.action]||l.action)+(x.reference?' · '+x.reference:'')+(x.quoi?' · '+x.quoi:'')+' · '+l.par)+'</span></li>';}).join('')+'</ul>':'<p class="hint">Rien pour le moment.</p>';
    });
  });
  $$('[data-vue]').forEach(function(b){b.addEventListener('click',function(){var v=b.getAttribute('data-vue');['demandes','comptes','biens','reglages'].forEach(function(k){$('#ad-'+k).hidden=v!==k;});if(v==='biens'&&!$('#ad-mb').dataset.lu)mesuresBiens();$$('[data-vue]').forEach(function(x){x.setAttribute('aria-pressed',String(x===b));});});});

  /* ce qu'il est advenu de l'e-mail au vendeur, en fin de message */
  function mailTxt(m){ return m==='envoye'?' · e-mail envoyé au vendeur.':m==='differe'?' · e-mail au vendeur prévu à 8 h (rien ne part entre 21 h et 8 h).':MAIL_CLIENTS?'.':' · prévenez-le par téléphone (e-mails pas encore ouverts).'; }
  function note(row,t,ko){var s=$('.saved',row);s.hidden=false;s.style.color=ko?'#7E2C1F':'';s.textContent=t;if(!ko)setTimeout(function(){s.hidden=true;},2500);}
  function zoneMsg(zone,txt,ok){var e=$(ok?'.ee-ok':'.ee-err',zone),a=$(ok?'.ee-err':'.ee-ok',zone);a.hidden=true;e.textContent=txt||'';e.hidden=!txt;}
  function demande(id){return D.filter(function(k){return k.id===id;})[0];}
  /* après une action : la ligne reflète le dossier tel que le serveur le rend (statut, prochaine action, visite) */
  function maj(row,x,n){
    if(!x||!n)return;
    ['statut','statut_libelle','notes','rappel_le','raison','action','visite','suspect','statut_le'].forEach(function(k){ if(n[k]!==undefined)x[k]=n[k]; });
    var st=$('summary .st',row); st.className='st '+x.statut; st.textContent=STATUTS[x.statut]||x.statut;
    $('[data-f=statut]',row).value=x.statut;
    var act=$('summary .act',row), txt=actionTxt(x);
    if(!act&&txt){ st.insertAdjacentHTML('afterend','<span class="act" data-test="action"></span>'); act=$('summary .act',row); }
    if(act){ act.textContent=txt?'→ '+txt:''; act.className='act'+(retard(x)?' ee-late':''); act.hidden=!txt; }
    $('[data-raison-f]',row).hidden=!(x.statut==='pause'||x.statut==='close');
    var bv=$('[data-bloc=visite]',row); if(bv)bv.outerHTML=blocVisite(x);
    var jr=$('[data-journal]',row); if(jr&&jr.open)journal(jr,x.id);
    stats();
  }
  var TRACES={ouverture:'Dossier ouvert par l\'agence',espace_ouvert:'Espace du vendeur ouvert',lien_espace:'Lien de son espace préparé pour le vendeur',estimation:'Estimation faite en ligne',statut:'Statut',visite_demandee:'Créneaux proposés par le vendeur',visite_fixee:'Visite fixée',visite_annulee:'Visite annulée',visite_agenda:'Page de réservation ouverte par le vendeur',rappel_visite:'Rappel de visite',avis_prepare:'Avis de valeur : brouillon commencé',avis_envoye:'Avis de valeur envoyé',mail:'E-mail au vendeur',cr_publie:'Compte rendu de visite publié',cr_supprime:'Compte rendu de visite supprimé',offre_recue:'Offre reçue',offre_statut:'Offre',offre_supprimee:'Offre supprimée',notaire:'Notaire',document:'Document déposé'};
  function trace(e){
    var d=e.detail||{}, t=TRACES[e.type]||e.type;
    if(e.type==='statut')t='Statut : '+(STATUTS[e.vers]||e.vers)+(d.raison?' ('+d.raison+')':'');
    else if(e.type==='estimation'&&d.duree)t='Estimation faite en ligne, en '+(d.duree<60000?Math.max(1,Math.round(d.duree/1000))+' s':Math.round(d.duree/60000)+' min');
    else if(e.type==='visite_fixee'&&d.debut)t='Visite fixée : '+EE.quandCourt(d.debut);
    else if(e.type==='visite_demandee'&&d.creneaux)t='Créneaux proposés : '+d.creneaux.map(EE.quandCourt).join(', ');
    else if(e.type==='mail')t=(d.envoye?'E-mail envoyé : ':'E-mail non envoyé : ')+(d.sujet||'')+(d.envoye?'':d.raison==='email_clients_ferme'?' (envoi aux vendeurs pas encore ouvert)':d.raison==='adresse_de_test'?' (adresse d\'essai)':d.raison==='heures_calmes'?' (gardé pour 8 h)':d.raison==='perime'?' (plus d\'actualité)':'');
    else if(e.type==='rappel_visite')t='Rappel de visite '+(d.envoye?'envoyé':'non envoyé');
    else if(e.type==='cr_publie')t='Compte rendu publié (visite du '+EE.jour(d.visite_le)+(d.soir_meme?', le jour même':'')+')';
    else if(e.type==='offre_recue')t='Offre reçue : '+EE.euros(d.montant);
    else if(e.type==='offre_statut')t='Offre de '+EE.euros(d.montant)+' : '+String(OFFRES[d.statut]||d.statut).toLowerCase();
    else if(e.type==='offre_supprimee')t='Offre supprimée : '+EE.euros(d.montant);
    else if(e.type==='notaire')t='Notaire'+(d.nom?' : '+d.nom:'')+((d.faites||[]).length?' · '+d.faites.join(', '):'')+(d.rdv?' · acte prévu le '+EE.jour(d.rdv):'');
    else if(e.type==='document')t='Document déposé : '+(d.libelle?d.libelle+' · ':'')+(d.nom||'');
    return '<li><span>'+EE.esc(t)+'</span><span>'+EE.esc(EE.quandCourt(e.cree_le))+'</span></li>';
  }
  /* Dernière trace d'un dossier : ce qui s'y est passé en dernier, et quand. Relue après chaque action de l'agence. */
  function traceTxt(t){ if(!t)return ''; var l=t.type==='statut'?'statut « '+(STATUTS[t.vers]||t.vers)+' »':(TRACES[t.type]||t.type); return 'Dernière trace : '+l.charAt(0).toLowerCase()+l.slice(1)+' · '+EE.quandCourt(t.le); }
  function tracesRelire(){
    $$('#ad-rows details.ee-row[open]').forEach(function(row){
      var id=+row.getAttribute('data-id');
      apiNu('/admin/journal?demande='+id).then(function(d){
        if(d._status!==200||!d.journal||!d.journal.length)return;
        var e=d.journal[0], x=demande(id), t={type:e.type,vers:e.vers,par:e.par,le:e.cree_le}, s=$('summary .tr',row);
        if(x)x.trace=t; if(s){s.textContent=traceTxt(t);s.hidden=false;}
      });
    });
  }
  /* Un seul endroit pour ne jamais afficher une trace périmée : toute écriture réussie sur un dossier (statut, visite,
     avis de valeur, compte rendu, offre, notaire, fichier) fait relire la trace des dossiers ouverts, un instant après. */
  var apiNu=EE.api, relire=null;
  EE.api=function(chemin,opts){
    var p=apiNu(chemin,opts);
    if(opts&&(opts.body!==undefined||opts.fichier)&&/^\/(admin\/(demande|visite|avis|compte-rendu|offre|notaire|fichier|dossier|compte\/lien)|fichier\/supprimer)/.test(chemin))
      p.then(function(d){ if(d&&d._status>=200&&d._status<300){clearTimeout(relire);relire=setTimeout(tracesRelire,700);} });
    return p;
  };
  function journal(det,id){ EE.api('/admin/journal?demande='+id).then(function(d){ $('ul',det).innerHTML=d._status===200?d.journal.map(trace).join(''):'<li><span>'+EE.esc(EE.message(d))+'</span><span></span></li>'; }); }
  $('#ad-rows').addEventListener('toggle',function(e){
    var det=e.target; if(!det||!det.hasAttribute||!det.open)return;
    if(det.hasAttribute('data-journal'))journal(det,+det.closest('.ee-row').getAttribute('data-id'));
    else if(det.classList.contains('ee-row'))suiteCharger(det,+det.getAttribute('data-id'));
  },true);
  $('#ad-rows').addEventListener('change',function(e){ var s=e.target.closest('[data-f=statut]'); if(!s)return; var row=s.closest('.ee-row'); $('[data-raison-f]',row).hidden=!(s.value==='pause'||s.value==='close'); });

  /* ---------- avis de valeur : brouillon, PDF fabriqué dans le navigateur, validation en un clic ---------- */
  function lignesTxt(l){return (l||[]).join('\n');}
  function avisOuvrir(row,id){
    var ed=$('[data-avis-ed]',row); ed.hidden=false; ed.innerHTML='<div class="ee-load" style="height:90px;" role="status" aria-label="Chargement"></div>';
    EE.api('/admin/avis?demande='+id).then(function(d){
      if(d._status!==200){ed.innerHTML='<p class="ee-err">'+EE.esc(EE.message(d))+'</p>';return;}
      AVIS[id]=d; avisForm(row,id);
    });
  }
  function avisForm(row,id){
    var d=AVIS[id], c=d.contenu, m=d.donnees.marche||{}, ed=$('[data-avis-ed]',row), n=(d.donnees.ventes||[]).length, p='ad-av-'+id+'-';
    var marche=d.donnees.assez_de_ventes
      ?'<p class="ee-note" data-test="avis-ventes"><b>'+n+' ventes réelles</b> seront citées dans le PDF (date, surface, prix, prix au m²), parmi '+m.comparables+' ventes comparables à moins de '+EE.rayon(m.rayon)+'. Prix médian : '+EE.euros(m.m2_median)+'/m².</p>'
      :'<p class="ee-note warn" data-test="avis-ventes"><b>Moins de 5 ventes comparables'+(n?' ('+n+')':'')+'.</b> Pas de fourchette automatique : le PDF le dit, et la fourchette ci-dessous est la vôtre.</p>';
    var strat=[0,1,2].map(function(k){var s=(c.strategie||[])[k]||{};return '<div class="ee-strat"><label for="'+p+'st'+k+'">Stratégie, point '+(k+1)+'</label><input type="text" id="'+p+'st'+k+'" data-av="strat-titre" maxlength="90" value="'+EE.esc(s.titre||'')+'" aria-label="Titre du point '+(k+1)+'"><textarea data-av="strat-texte" maxlength="600" aria-label="Texte du point '+(k+1)+'">'+EE.esc(s.texte||'')+'</textarea></div>';}).join('');
    var cand=d.donnees.candidats||[];
    var choixVentes=cand.length?'<details class="ee-ventes" data-av-ventes><summary><span data-av-compte></span> <u>Choisir</u></summary>'+
      '<p class="hint">Cochez les ventes à citer (12 au plus). Les ventes au prix très éloigné des autres ne sont pas cochées d\'office.</p><ul>'+cand.map(function(v,k){
        return '<li><label><input type="checkbox" data-av-vente="'+EE.esc(v.cle)+'"'+(v.retenue?' checked':'')+'><span><b>'+EE.esc(v.mois.slice(5)+'/'+v.mois.slice(0,4))+' · '+EE.esc(v.voie||v.commune||'')+'</b><small>'+v.surface+' m²'+(v.pieces?' · '+v.pieces+' p.':'')+' · '+(v.prix?EE.euros(v.prix):'prix non publié')+' · '+EE.euros(v.prix_m2)+'/m² · à '+EE.rayon(v.distance)+(v.atypique?' · <i>prix atypique</i>':'')+'</small></span></label></li>';
      }).join('')+'</ul></details>':'';
    ed.innerHTML=marche+choixVentes+
      '<div class="field"><label for="'+p+'dv">Date de la visite</label><input type="date" id="'+p+'dv" data-av="date_visite" value="'+EE.esc(c.date_visite||'')+'"></div>'+
      '<div class="field"><label for="'+p+'no">Notes de visite <small>(dictez : le texte est repris tel quel)</small></label><textarea id="'+p+'no" data-av="notes" maxlength="4000" style="min-height:140px;">'+EE.esc(c.notes||'')+'</textarea></div>'+
      '<div class="field"><label for="'+p+'at">Atouts <small>(un par ligne)</small></label><textarea id="'+p+'at" data-av="atouts">'+EE.esc(lignesTxt(c.atouts))+'</textarea></div>'+
      '<div class="field"><label for="'+p+'vi">Points de vigilance <small>(un par ligne)</small></label><textarea id="'+p+'vi" data-av="vigilance">'+EE.esc(lignesTxt(c.vigilance))+'</textarea></div>'+
      '<div class="ee-2"><div class="field"><label for="'+p+'pb">Valeur basse (€)</label><input type="number" inputmode="numeric" id="'+p+'pb" data-av="prix_bas" min="1000" step="1000" value="'+(c.prix_bas||'')+'"></div>'+
      '<div class="field"><label for="'+p+'ph">Valeur haute (€)</label><input type="number" inputmode="numeric" id="'+p+'ph" data-av="prix_haut" min="1000" step="1000" value="'+(c.prix_haut||'')+'"></div></div>'+
      (d.donnees.estimation&&d.donnees.assez_de_ventes?'<p class="hint">Estimation en ligne : '+EE.euros(d.donnees.estimation.prix_bas)+' – '+EE.euros(d.donnees.estimation.prix_haut)+'. Ajustez après la visite : c\'est votre fourchette qui figure dans l\'avis.</p>':'')+
      strat+
      '<p class="ee-err" role="alert" hidden></p><p class="ee-ok" role="status" hidden></p>'+
      '<div class="acts"><button type="button" class="btn btn-primary" data-avis-pdf>Enregistrer et créer le PDF</button>'+
        '<a class="btn" data-avis-lien target="_blank" rel="noopener"'+(d.avis&&d.avis.fichier?' href="'+lienFichier(d.avis.fichier)+'"':' hidden')+'>Ouvrir le PDF</a>'+
        '<button type="button" class="btn" data-avis-valider'+(d.avis&&d.avis.fichier&&d.avis.fichier.role==='brouillon'?'':' hidden')+'>Valider et envoyer au vendeur</button></div>'+
      '<label class="ee-check-l"><input type="checkbox" data-avis-prevenir'+(MAIL_CLIENTS?' checked':' disabled')+'>'+(MAIL_CLIENTS?'Prévenir le vendeur par e-mail à la validation':'E-mails aux vendeurs pas encore ouverts : prévenez-le par téléphone')+'</label>';
    compteVentes(ed);
  }
  function compteVentes(ed){
    var boites=$$('[data-av-vente]',ed), n=boites.filter(function(b){return b.checked;}).length, c=$('[data-av-compte]',ed);
    if(c)c.textContent=n+' vente'+(n>1?'s':'')+' citée'+(n>1?'s':'')+' sur '+boites.length+' proposées.';
    boites.forEach(function(b){b.disabled=!b.checked&&n>=12;});
  }
  $('#ad-rows').addEventListener('change',function(e){ if(e.target.closest('[data-av-vente]'))compteVentes(e.target.closest('[data-avis-ed]')); });
  function avisContenu(row){
    var ed=$('[data-avis-ed]',row), v=function(k){return $('[data-av='+k+']',ed).value;};
    var titres=$$('[data-av=strat-titre]',ed), textes=$$('[data-av=strat-texte]',ed);
    var boites=$$('[data-av-vente]',ed);
    return {notes:v('notes'),atouts:v('atouts').split('\n'),vigilance:v('vigilance').split('\n'),prix_bas:v('prix_bas')||null,prix_haut:v('prix_haut')||null,date_visite:v('date_visite'),
      ventes:boites.length?boites.filter(function(b){return b.checked;}).map(function(b){return b.getAttribute('data-av-vente');}):null,
      strategie:titres.map(function(t,k){return {titre:t.value,texte:textes[k].value};})};
  }
  function nomPdf(d){ return ('Avis de valeur - '+(d.donnees.bien.adresse||d.reference)).replace(/[\\/:*?"<>|]+/g,' ').slice(0,100)+'.pdf'; }
  function avisPdf(row,id,b){
    var ed=$('[data-avis-ed]',row), cA=avisContenu(row);
    // jamais de prix inventé : sans fourchette saisie par l'agent, pas d'avis de valeur
    if(!(+cA.prix_bas>0)||!(+cA.prix_haut>0)){zoneMsg(ed,'Indiquez la fourchette de prix (valeur basse et valeur haute) : c\'est la vôtre qui figure dans l\'avis.');$('[data-av=prix_bas]',ed).focus();return;}
    if(+cA.prix_haut<+cA.prix_bas){zoneMsg(ed,'La valeur haute doit dépasser la valeur basse.');$('[data-av=prix_haut]',ed).focus();return;}
    b.disabled=true; zoneMsg(ed,'Enregistrement…',true);
    EE.api('/admin/avis',{body:{demande:id,contenu:cA}}).then(function(d){
      if(d._status!==200){b.disabled=false;zoneMsg(ed,EE.messageChamp(d));return;}
      AVIS[id]=d; var x=demande(id); if(x)x.avis={prepare_le:d.avis.prepare_le,valide_le:d.avis.valide_le};
      var nv=$('[data-test=avis-ventes] b',ed); if(nv&&d.donnees.assez_de_ventes)nv.textContent=d.donnees.ventes.length+' ventes réelles';
      zoneMsg(ed,'Création du PDF…',true);
      return EE.script(C.avisPdf||'/assets/avis/avis-pdf.js?v=1').then(function(){
        return window.EEAvis.generer({site:d.site,reference:d.reference,date:new Date().toISOString().slice(0,10),contenu:d.contenu,donnees:d.donnees});
      }).then(function(octets){
        var f=new Blob([octets],{type:'application/pdf'});
        return EE.api('/admin/avis/brouillon?demande='+id,{fichier:f,nom:nomPdf(d),delai:120000});
      }).then(function(r){
        b.disabled=false;
        if(r._status!==201){zoneMsg(ed,EE.message(r));return;}
        d.avis.fichier=r.fichier;
        var lien=$('[data-avis-lien]',ed); lien.href=lienFichier(r.fichier); lien.hidden=false;
        $('[data-avis-valider]',ed).hidden=false;
        var liste=$('.ee-flist',row); $$('li',liste).forEach(function(li){ if((x&&x.fichiers||[]).some(function(k){return k.id===li.getAttribute('data-fid')&&k.role==='brouillon';}))li.parentNode.removeChild(li); });
        if(x){x.fichiers=(x.fichiers||[]).filter(function(k){return k.role!=='brouillon';});x.fichiers.push(r.fichier);}
        liste.insertAdjacentHTML('beforeend',fichier(r.fichier));
        zoneMsg(ed,'PDF créé ('+EE.taille(r.fichier.taille)+'). Relisez-le, puis validez : il part dans l\'espace du vendeur.',true);
      },function(){ b.disabled=false; zoneMsg(ed,'Le PDF n\'a pas pu être créé sur cet appareil. Réessayez, ou déposez un PDF fait ailleurs (plus bas).'); });
    });
  }
  function avisValider(row,id,b){
    var ed=$('[data-avis-ed]',row), x=demande(id);
    if(!EE.confirmer(b,'Confirmer : le vendeur le verra dans son espace'))return;
    b.disabled=true;
    EE.api('/admin/avis/valider',{body:{demande:id,prevenir:$('[data-avis-prevenir]',ed).checked}}).then(function(d){
      b.disabled=false; b.textContent='Valider et envoyer au vendeur';
      if(d._status!==200){zoneMsg(ed,EE.messageChamp(d));return;}
      if(x){x.avis={prepare_le:(x.avis||{}).prepare_le,valide_le:new Date().toISOString()};x.fichiers=(x.fichiers||[]).filter(function(k){return k.role!=='avis'&&k.id!==d.fichier.id;});x.fichiers.push(d.fichier);}
      $('.ee-flist',row).innerHTML=((x&&x.fichiers)||[]).map(fichier).join('');
      maj(row,x,d.demande);
      b.hidden=true;
      $('[data-avis-etat]',row).textContent='Envoyé au vendeur le '+EE.jour(new Date().toISOString())+'.';
      zoneMsg(ed,'Avis de valeur déposé dans l\'espace du vendeur'+(d.mail==='envoye'?' · e-mail envoyé.':mailTxt(d.mail)),true);
    });
  }

  /* ---------- après le mandat : comptes rendus de visite, offres, notaire (chargés à l'ouverture du dossier) ---------- */
  function prevenirCase(attr,txt){ return '<label class="ee-check-l"><input type="checkbox" '+attr+(MAIL_CLIENTS?' checked':' disabled')+'>'+(MAIL_CLIENTS?txt:'E-mails aux vendeurs pas encore ouverts : prévenez-le par téléphone')+'</label>'; }
  function tete(titre,compte){ return '<summary><span class="lab">'+titre+'</span><small>'+EE.esc(compte)+'</small></summary><div class="ee-plie-in">'; }
  function pluriel(n,un,des){ return n+' '+(n>1?des:un); }
  function blocCr(id,s,ouvert){
    var l=s.comptes_rendus||[], pub=l.filter(function(c){return c.publie;}).length, p='ad-cr-'+id+'-';
    return '<details class="ee-bloc ee-plie" data-bloc="cr"'+(ouvert?' open':'')+'>'+tete('Comptes rendus de visite',l.length?pluriel(pub,'publié','publiés')+(l.length>pub?' · '+pluriel(l.length-pub,'brouillon','brouillons'):''):'aucun')+
      '<p class="hint">Après chaque visite, le soir même : dictez trois lignes, publiez. Le vendeur les lit dans son espace.</p>'+
      '<ul class="ee-items">'+l.map(function(c){
        return '<li data-cr="'+c.id+'"><p class="t"><b>Visite du '+EE.esc(EE.jourLong(c.visite_le))+'</b><span class="tag'+(c.publie?' ok':'')+'">'+(c.publie?'Publié':'Brouillon')+'</span></p><p class="txt">'+EE.esc(c.texte)+'</p>'+
          '<div class="ee-links">'+(c.publie?'':'<button type="button" data-cr-publier>Publier</button>')+'<button type="button" data-cr-modifier>Modifier</button><button type="button" class="ee-danger" data-cr-suppr>Supprimer</button></div></li>';
      }).join('')+'</ul>'+
      '<div class="ee-saisie" data-saisie>'+
        '<div class="field"><label for="'+p+'d">Date de la visite</label><input type="date" id="'+p+'d" data-cr-f="visite_le" max="'+AUJ+'" value="'+AUJ+'"></div>'+
        '<div class="field"><label for="'+p+'t">Compte rendu <small>(dictez : le texte est repris tel quel)</small></label><textarea id="'+p+'t" data-cr-f="texte" maxlength="3000"></textarea></div>'+
        '<label class="ee-check-l"><input type="checkbox" data-cr-f="publie" checked>Publier tout de suite dans l\'espace du vendeur</label>'+
        prevenirCase('data-cr-f="prevenir"','Le prévenir par e-mail à la publication')+
        '<p class="ee-err" role="alert" hidden></p><p class="ee-ok" role="status" hidden></p>'+
        '<div class="acts"><button type="button" class="btn btn-primary" data-cr-save>Enregistrer le compte rendu</button><button type="button" class="btn" data-annuler hidden>Annuler</button></div>'+
      '</div></div></details>';
  }
  function blocOffres(id,s,ouvert){
    var l=s.offres||[], p='ad-of-'+id+'-', etude=l.filter(function(o){return o.statut==='etude';}).length;
    return '<details class="ee-bloc ee-plie" data-bloc="offres"'+(ouvert?' open':'')+'>'+tete('Offres',l.length?pluriel(l.length,'offre','offres')+(etude?' · '+etude+' à l\'étude':''):'aucune')+
      '<p class="hint">Chaque offre reçue, dès qu\'elle arrive. Le vendeur la voit dans son espace : montant, date, conditions, où elle en est.</p>'+
      '<ul class="ee-items">'+l.map(function(o){
        return '<li data-of="'+o.id+'"><p class="t"><b>'+EE.euros(o.montant)+'</b><span class="tag'+(o.statut==='acceptee'?' ok':o.statut==='etude'?' att':'')+'">'+EE.esc(o.statut_libelle)+'</span></p><p class="meta">Reçue le '+EE.jour(o.recue_le)+'</p>'+(o.conditions?'<p class="txt">'+EE.esc(o.conditions)+'</p>':'')+
          '<div class="field"><label for="'+p+'s'+o.id+'">Où en est cette offre</label><select id="'+p+'s'+o.id+'" data-of-statut>'+Object.keys(OFFRES).map(function(k){return '<option value="'+k+'"'+(k===o.statut?' selected':'')+'>'+EE.esc(OFFRES[k])+'</option>';}).join('')+'</select></div>'+
          '<div class="ee-links"><button type="button" data-of-modifier>Modifier</button><button type="button" class="ee-danger" data-of-suppr>Supprimer</button></div></li>';
      }).join('')+'</ul>'+
      '<div class="ee-saisie" data-saisie>'+
        '<div class="ee-2"><div class="field"><label for="'+p+'m">Montant (€)</label><input type="number" inputmode="numeric" id="'+p+'m" data-of-f="montant" min="1000" step="500"></div>'+
        '<div class="field"><label for="'+p+'d">Reçue le</label><input type="date" id="'+p+'d" data-of-f="recue_le" max="'+AUJ+'" value="'+AUJ+'"></div></div>'+
        '<div class="field"><label for="'+p+'c">Conditions <small>(financement, délai, conditions suspensives)</small></label><textarea id="'+p+'c" data-of-f="conditions" maxlength="1500"></textarea></div>'+
        prevenirCase('data-of-f="prevenir"','Prévenir le vendeur par e-mail')+
        '<p class="ee-err" role="alert" hidden></p><p class="ee-ok" role="status" hidden></p>'+
        '<div class="acts"><button type="button" class="btn btn-primary" data-of-save>Enregistrer l\'offre</button><button type="button" class="btn" data-annuler hidden>Annuler</button></div>'+
      '</div></div></details>';
  }
  function blocNotaire(id,s,ouvert){
    var n=s.notaire||{etapes:[]}, p='ad-nt-'+id+'-', faites=(n.etapes||[]).filter(function(e){return e.fait;}).length;
    return '<details class="ee-bloc ee-plie" data-bloc="notaire"'+(ouvert?' open':'')+'>'+tete('Notaire',n.nom?n.nom+(faites?' · '+pluriel(faites,'étape passée','étapes passées'):''):'à renseigner')+
      '<p class="hint">Du compromis à l\'acte : le vendeur voit le notaire et chaque étape passée dans son espace.</p>'+
      '<div class="field"><label for="'+p+'n">Notaire</label><input type="text" id="'+p+'n" data-nt-f="nom" maxlength="120" placeholder="Maître …" value="'+EE.esc(n.nom||'')+'"></div>'+
      '<div class="field"><label for="'+p+'c">Coordonnées de l\'étude <small>(adresse, téléphone)</small></label><input type="text" id="'+p+'c" data-nt-f="coordonnees" maxlength="300" value="'+EE.esc(n.coordonnees||'')+'"></div>'+
      '<ul class="ee-etapes">'+(n.etapes||[]).map(function(e){
        return '<li data-nt-etape="'+EE.esc(e.cle)+'"><label class="ee-check-l"><input type="checkbox" data-nt-fait'+(e.fait?' checked':'')+'>'+EE.esc(e.libelle)+'</label><input type="date" data-nt-le value="'+EE.esc(e.le||'')+'" aria-label="Date : '+EE.esc(e.libelle)+'"></li>';
      }).join('')+'</ul>'+
      '<p class="hint">Cochez une étape quand elle est passée. Une date sans coche : c\'est la date prévue.</p>'+
      prevenirCase('data-nt-f="prevenir"','Prévenir le vendeur par e-mail quand une étape passe')+
      '<p class="ee-err" role="alert" hidden></p><p class="ee-ok" role="status" hidden></p>'+
      '<div class="acts"><button type="button" class="btn btn-primary" data-nt-save>Enregistrer</button></div>'+
    '</div></details>';
  }
  function suiteRendre(row,id){
    var z=$('[data-suite]',row), s=SUITE[id], x=demande(id)||{}; if(!z||!s)return;
    var etat={}; $$('details[data-bloc]',z).forEach(function(d){etat[d.getAttribute('data-bloc')]=d.open;});
    function o(k,statuts){ return etat[k]!==undefined?etat[k]:statuts.indexOf(x.statut)>=0; }
    z.innerHTML=blocCr(id,s,o('cr',['annonce','visites']))+blocOffres(id,s,o('offres',['visites','offre']))+blocNotaire(id,s,o('notaire',['offre','compromis']));
  }
  function suiteCharger(row,id){
    var z=$('[data-suite]',row); if(!z)return;
    if(SUITE[id]){ if(!z.firstChild)suiteRendre(row,id); return; }
    z.innerHTML='<div class="ee-load" style="height:64px;" role="status" aria-label="Chargement"></div>';
    EE.api('/admin/suite?demande='+id).then(function(d){
      if(d._status!==200){z.innerHTML='<p class="ee-err">'+EE.esc(EE.message(d))+'</p>';return;}
      SUITE[id]=d; suiteRendre(row,id);
    });
  }
  function ranger(l,cle){ return l.sort(function(a,b){ return a[cle]===b[cle]?b.id-a.id:(a[cle]<b[cle]?1:-1); }); }
  /* après un enregistrement : la liste à jour, la ligne du dossier (statut, prochaine action), le message */
  function suiteApres(row,id,bloc,d,txt){
    suiteRendre(row,id); maj(row,demande(id),d.demande);
    zoneMsg($('[data-bloc='+bloc+']',row),txt,true);
  }
  function confirmer(b,txt){ return EE.confirmer(b,txt); }
  function suiteClic(e,row,id){
    var t=e.target.closest('button'); if(!t)return false;
    var zone=t.closest('details[data-bloc]'); if(!zone||!SUITE[id])return false;
    var s=SUITE[id], li=t.closest('li'), f;
    /* --- comptes rendus --- */
    if(t.hasAttribute('data-cr-save')){
      f=function(k){return $('[data-cr-f='+k+']',zone);};
      var c={visite_le:f('visite_le').value,texte:f('texte').value,publie:f('publie').checked,prevenir:f('prevenir').checked}, ce=zone.getAttribute('data-edit');
      if(ce)c.id=+ce; else c.demande=id;
      if(!c.visite_le){zoneMsg(zone,'Indiquez la date de la visite.');f('visite_le').focus();return true;}
      if(!c.texte.trim()){zoneMsg(zone,'Écrivez ou dictez le compte rendu.');f('texte').focus();return true;}
      t.disabled=true;
      EE.api('/admin/compte-rendu',{body:c}).then(function(d){
        t.disabled=false;
        if(d._status>=300){zoneMsg(zone,EE.messageChamp(d));return;}
        s.comptes_rendus=ranger(s.comptes_rendus.filter(function(k){return k.id!==d.compte_rendu.id;}).concat([d.compte_rendu]),'visite_le');
        suiteApres(row,id,'cr',d,!d.compte_rendu.publie?'Brouillon enregistré : le vendeur ne le voit pas encore.':ce&&d.mail==='non'?'Compte rendu modifié.':'Compte rendu publié dans l\'espace du vendeur'+mailTxt(d.mail));
      });
      return true;
    }
    if(t.hasAttribute('data-cr-publier')){
      t.disabled=true;
      EE.api('/admin/compte-rendu',{body:{id:+li.getAttribute('data-cr'),publie:true,prevenir:$('[data-cr-f=prevenir]',zone).checked}}).then(function(d){
        t.disabled=false;
        if(d._status!==200){zoneMsg(zone,EE.messageChamp(d));return;}
        s.comptes_rendus=s.comptes_rendus.map(function(k){return k.id===d.compte_rendu.id?d.compte_rendu:k;});
        suiteApres(row,id,'cr',d,'Compte rendu publié dans l\'espace du vendeur'+mailTxt(d.mail));
      });
      return true;
    }
    if(t.hasAttribute('data-cr-modifier')){
      var cr=s.comptes_rendus.filter(function(k){return k.id===+li.getAttribute('data-cr');})[0]; if(!cr)return true;
      zone.setAttribute('data-edit',cr.id);
      $('[data-cr-f=visite_le]',zone).value=cr.visite_le; $('[data-cr-f=texte]',zone).value=cr.texte; $('[data-cr-f=publie]',zone).checked=!!cr.publie;
      $('[data-cr-save]',zone).textContent='Enregistrer les changements'; $('[data-annuler]',zone).hidden=false; $('[data-cr-f=texte]',zone).focus();
      return true;
    }
    if(t.hasAttribute('data-cr-suppr')){
      if(!confirmer(t,'Confirmer la suppression'))return true;
      var cid=+li.getAttribute('data-cr');
      EE.api('/admin/compte-rendu',{body:{id:cid,supprimer:true}}).then(function(d){
        if(d._status!==200){zoneMsg(zone,EE.message(d));return;}
        s.comptes_rendus=s.comptes_rendus.filter(function(k){return k.id!==cid;}); suiteRendre(row,id); zoneMsg($('[data-bloc=cr]',row),'Compte rendu supprimé.',true);
      });
      return true;
    }
    /* --- offres --- */
    if(t.hasAttribute('data-of-save')){
      f=function(k){return $('[data-of-f='+k+']',zone);};
      var o={montant:f('montant').value,recue_le:f('recue_le').value,conditions:f('conditions').value,prevenir:f('prevenir').checked}, oe=zone.getAttribute('data-edit');
      if(oe)o.id=+oe; else o.demande=id;
      if(!(+o.montant>=1000)){zoneMsg(zone,'Indiquez le montant de l\'offre, en euros.');f('montant').focus();return true;}
      t.disabled=true;
      EE.api('/admin/offre',{body:o}).then(function(d){
        t.disabled=false;
        if(d._status>=300){zoneMsg(zone,EE.messageChamp(d));return;}
        s.offres=ranger(s.offres.filter(function(k){return k.id!==d.offre.id;}).concat([d.offre]),'recue_le');
        suiteApres(row,id,'offres',d,oe?'Offre modifiée.':'Offre enregistrée : le vendeur la voit dans son espace'+mailTxt(d.mail));
      });
      return true;
    }
    if(t.hasAttribute('data-of-modifier')){
      var of=s.offres.filter(function(k){return k.id===+li.getAttribute('data-of');})[0]; if(!of)return true;
      zone.setAttribute('data-edit',of.id);
      $('[data-of-f=montant]',zone).value=of.montant; $('[data-of-f=recue_le]',zone).value=of.recue_le; $('[data-of-f=conditions]',zone).value=of.conditions||'';
      $('[data-of-save]',zone).textContent='Enregistrer les changements'; $('[data-annuler]',zone).hidden=false; $('[data-of-f=montant]',zone).focus();
      return true;
    }
    if(t.hasAttribute('data-of-suppr')){
      if(!confirmer(t,'Confirmer la suppression'))return true;
      var oid=+li.getAttribute('data-of');
      EE.api('/admin/offre',{body:{id:oid,supprimer:true}}).then(function(d){
        if(d._status!==200){zoneMsg(zone,EE.message(d));return;}
        s.offres=s.offres.filter(function(k){return k.id!==oid;}); suiteApres(row,id,'offres',d,'Offre supprimée.');
      });
      return true;
    }
    /* --- notaire --- */
    if(t.hasAttribute('data-nt-save')){
      var etapes={}; $$('[data-nt-etape]',zone).forEach(function(l){ etapes[l.getAttribute('data-nt-etape')]={fait:$('[data-nt-fait]',l).checked,le:$('[data-nt-le]',l).value}; });
      t.disabled=true;
      EE.api('/admin/notaire',{body:{demande:id,nom:$('[data-nt-f=nom]',zone).value,coordonnees:$('[data-nt-f=coordonnees]',zone).value,etapes:etapes,prevenir:$('[data-nt-f=prevenir]',zone).checked}}).then(function(d){
        t.disabled=false;
        if(d._status!==200){zoneMsg(zone,EE.messageChamp(d));return;}
        s.notaire=d.notaire; suiteRendre(row,id);
        zoneMsg($('[data-bloc=notaire]',row),'Enregistré : le vendeur le voit dans son espace'+(d.mail==='non'?'.':mailTxt(d.mail)),true);
      });
      return true;
    }
    if(t.hasAttribute('data-annuler')){ zone.removeAttribute('data-edit'); suiteRendre(row,id); return true; }
    return false;
  }
  /* une offre change d'état (à l'étude, acceptée, refusée…) : enregistré dès le choix */
  $('#ad-rows').addEventListener('change',function(e){
    var sel=e.target.closest('[data-of-statut]'); if(!sel)return;
    var row=sel.closest('.ee-row'), id=+row.getAttribute('data-id'), oid=+sel.closest('li').getAttribute('data-of'), zone=sel.closest('details[data-bloc]');
    sel.disabled=true;
    EE.api('/admin/offre',{body:{id:oid,statut:sel.value}}).then(function(d){
      sel.disabled=false;
      if(d._status!==200){zoneMsg(zone,EE.messageChamp(d));return;}
      SUITE[id].offres=SUITE[id].offres.map(function(k){return k.id===oid?d.offre:k;});
      suiteApres(row,id,'offres',d,'Offre de '+EE.euros(d.offre.montant)+' : '+String(d.offre.statut_libelle).toLowerCase()+'. Le vendeur le voit dans son espace.');
    });
  });
  $('#ad-rows').addEventListener('click',function(e){
    var row=e.target.closest('.ee-row'); if(!row)return; var id=+row.getAttribute('data-id'), x=demande(id);
    if(suiteClic(e,row,id))return;
    if(espaceClic(e,row,id,x))return;
    var b=e.target.closest('[data-save]');
    if(b){
      var corps={id:id,statut:$('[data-f=statut]',row).value,notes:$('[data-f=notes]',row).value,rappel_le:$('[data-f=rappel_le]',row).value,raison:$('[data-f=raison]',row).value,prevenir:$('[data-f=prevenir]',row).checked};
      b.disabled=true;
      EE.api('/admin/demande',{body:corps}).then(function(d){
        b.disabled=false;
        if(d._status!==200){note(row,EE.messageChamp(d),true);return;}
        row.removeAttribute('data-sale');
        maj(row,x,d.demande);
        note(row,d.mail==='envoye'?'Enregistré · e-mail envoyé au vendeur':d.mail==='differe'?'Enregistré · e-mail au vendeur prévu à 8 h':'Enregistré');
      });
      return;
    }
    /* visite : confirmer un créneau proposé, fixer une autre date, annuler */
    var vf=e.target.closest('[data-vfix],[data-vfixdate],[data-vannuler]');
    if(vf){
      var zone=$('[data-bloc=visite]',row), corpsV={demande:id,prevenir:$('[data-vprevenir]',row).checked};
      if(vf.hasAttribute('data-vannuler')){
        if(!EE.confirmer(vf,'Confirmer l\'annulation de la visite'))return;
        corpsV={demande:id,annuler:true};
      } else if(vf.hasAttribute('data-vfix'))corpsV.debut=vf.getAttribute('data-vfix');
      else { corpsV.debut_local=$('[data-vdate]',row).value; if(!corpsV.debut_local){zoneMsg(zone,'Choisissez la date et l\'heure de la visite.');return;} }
      vf.disabled=true;
      EE.api('/admin/visite',{body:corpsV}).then(function(d){
        vf.disabled=false;
        if(d._status!==200){zoneMsg(zone,EE.messageChamp(d));return;}
        maj(row,x,d.demande);
        zoneMsg($('[data-bloc=visite]',row),corpsV.annuler?'Visite annulée.':'Visite fixée'+(d.mail==='envoye'?' · confirmation envoyée au vendeur par e-mail.':mailTxt(d.mail)),true);
      });
      return;
    }
    if(e.target.closest('[data-avis-ouvrir]')){ avisOuvrir(row,id); return; }
    if(e.target.closest('[data-avis-pdf]')){ avisPdf(row,id,e.target.closest('[data-avis-pdf]')); return; }
    if(e.target.closest('[data-avis-valider]')){ avisValider(row,id,e.target.closest('[data-avis-valider]')); return; }
    var h=e.target.closest('[data-humain]');
    if(h){ EE.api('/admin/demande',{body:{id:id,suspect:false}}).then(function(d){ if(d._status===200){if(x)x.suspect=false;filtrer();} }); return; }
    var ds=e.target.closest('[data-dsuppr]');
    if(ds){
      if(!EE.confirmer(ds,'Confirmer : demande, journal et fichiers effacés définitivement'))return;
      EE.occupe(ds,true);
      EE.api('/admin/demande/supprimer',{body:{id:id}}).then(function(d){
        EE.occupe(ds,false);
        if(d._status===200||d._status===404){row.removeAttribute('data-sale');D=D.filter(function(k){return k.id!==id;});stats();filtrer(true);var ae=$('#ad-nb');if(ae)ae.textContent='Demande supprimée. '+ae.textContent;}
        else zoneMsg($('.ee-files',row),EE.message(d));
      });
      return;
    }
    var fs=e.target.closest('[data-fsuppr]');
    if(fs){
      if(!EE.confirmer(fs,'Confirmer le retrait'))return;
      var fid=fs.getAttribute('data-fsuppr');
      EE.occupe(fs,true);
      EE.api('/fichier/supprimer',{body:{id:fid}}).then(function(d){ EE.occupe(fs,false); if(d._status===200){ if(x)x.fichiers=(x.fichiers||[]).filter(function(f){return f.id!==fid;}); var li=fs.closest('li'); li.parentNode.removeChild(li);} else zoneMsg($('.ee-files',row),EE.message(d)); });
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
      EE.api('/admin/fichier?demande='+id+'&role='+role+(role==='document'&&$('[data-doc-nature]',row).value?'&libelle='+$('[data-doc-nature]',row).value:''),{fichier:f,nom:f.name,delai:120000}).then(function(d){
        if(d._status===201){
          liste.insertAdjacentHTML('beforeend',fichier(d.fichier)); if(x){(x.fichiers=x.fichiers||[]).push(d.fichier);}
          if(d.statut&&x&&x.statut!==d.statut){x.statut=d.statut;$('[data-f=statut]',row).value=d.statut;var st=$('summary .st',row);st.className='st '+d.statut;st.textContent=STATUTS[d.statut];stats();}
          if(role==='avis'){var he=$('[data-avis-etat]',row);if(he)he.textContent='Avis de valeur déposé le '+EE.jour(new Date().toISOString())+'.';}
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
        if(d._status!==200){out.className='ee-err';out.textContent=d.error==='compte_agence'?'C\'est un compte de l\'agence : il s\'ouvre depuis /admin/, avec le lien reçu par e-mail.':EE.message(d);return;}
        var txt='Bonjour '+(c.prenom||'')+', voici le lien pour '+(type==='reinit'?'choisir un nouveau mot de passe pour votre espace':'ouvrir votre espace et retrouver votre estimation')+' (valable 24 h, une seule fois) : '+d.lien;
        out.className='ee-ok';
        out.innerHTML=(type==='reinit'?'Lien « nouveau mot de passe »':'Lien de connexion')+', valable 24 h, à transmettre au client :<br><span style="word-break:break-all;" data-test="lien">'+EE.esc(d.lien)+'</span><br>'+
          (c.telephone?'<a href="https://wa.me/'+EE.esc(String(c.telephone).replace(/\D/g,'').replace(/^0/,'33'))+'?text='+encodeURIComponent(txt)+'" target="_blank" rel="noopener">Envoyer par WhatsApp</a> · <a href="sms:'+EE.esc(String(c.telephone).replace(/[^\d+]/g,''))+'?&body='+encodeURIComponent(txt)+'">par SMS</a> · ':'')+
          '<a href="mailto:'+EE.esc(c.email)+'?subject='+encodeURIComponent('Votre espace estimation')+'&body='+encodeURIComponent(txt)+'">par e-mail</a>';
      });
      return;
    }
    var b=e.target.closest('[data-del]'); if(!b)return;
    if(!EE.confirmer(b,'Confirmer : compte, estimations et fichiers effacés définitivement'))return;
    EE.occupe(b,true);
    EE.api('/admin/compte/supprimer',{body:{id:+b.getAttribute('data-del')}}).then(function(d){
      EE.occupe(b,false);
      if(d._status===200){charger();return;}
      var o=$('[data-lien-out]',b.closest('.ee-row')); if(o){o.hidden=false;o.className='ee-err';o.textContent=EE.message(d);}
    });
  });
  $('#ad-flux').addEventListener('click',function(){
    var b=this, out=$('#ad-flux-out');
    if(!EE.confirmer(b,'Confirmer : l\'ancienne clé ne marchera plus'))return;
    EE.occupe(b,true);
    EE.api('/admin/flux',{body:{}}).then(function(d){
      EE.occupe(b,false); out.hidden=false; b.textContent='Créer une nouvelle clé';
      if(d._status!==200){out.className='ee-err';out.textContent=EE.message(d);return;}
      out.className='ee-ok'; out.innerHTML='Nouvelle clé créée. Collez cette formule dans la cellule A1 de l\'onglet « Site » (elle ne sera plus affichée) :<br><span style="word-break:break-all;" data-test="formule">'+EE.esc(d.formule)+'</span>'+(d.formule_promesses?'<br><br>Et celle-ci dans la cellule A1 de l\'onglet « Promesses » :<br><span style="word-break:break-all;" data-test="formule-promesses">'+EE.esc(d.formule_promesses)+'</span>':'');
    });
  });
  function agendaIcs(valeur){
    var out=$('#ad-ics-out');
    EE.api('/admin/reglages',{body:{agenda_ics:valeur}}).then(function(d){
      out.hidden=false;
      if(d._status!==200){out.className='ee-err';out.textContent=EE.messageChamp(d);return;}
      $('#ad-ics').value='';
      out.className=d.agenda==='illisible'?'ee-err':'ee-ok';
      out.textContent=d.agenda==='relie'?'Agenda Google relié et lu : les moments pris dans votre agenda ne sont plus proposés aux vendeurs.':d.agenda==='illisible'?'Adresse enregistrée, mais l\'agenda n\'a pas pu être lu. Vérifiez que vous avez copié l\'« Adresse secrète au format iCal » (et pas l\'adresse publique).':'Agenda délié : seuls les rendez-vous fixés ici sont évités.';
    });
  }
  $('#ad-ics-save').addEventListener('click',function(){ var v=$('#ad-ics').value.trim(); if(!v){$('#ad-ics').focus();return;} agendaIcs(v); });
  $('#ad-ics-off').addEventListener('click',function(){ agendaIcs(''); });
  $('#ad-rdv-save').addEventListener('click',function(){
    var out=$('#ad-rdv-out');
    EE.api('/admin/reglages',{body:{rdv_url:$('#ad-rdv-url').value.trim()}}).then(function(d){
      out.hidden=false;
      if(d._status!==200){out.className='ee-err';out.textContent=EE.messageChamp(d);return;}
      out.className='ee-ok'; out.textContent=d.rdv_url?'Enregistré : les vendeurs choisissent leur créneau dans votre agenda.':'Enregistré : les vendeurs proposent jusqu\'à 3 créneaux, vous confirmez.';
    });
  });
  /* ---------- espace du vendeur : le lien à lui envoyer, ou l'espace à ouvrir quand le dossier n'en a pas ---------- */
  function origineAgence(d){ return !!(d&&d.reponses&&d.reponses.origine==='agence'); }
  /* (la fiche d'un dossier ouvert par l'agence ne promet pas de rappel : la fourchette se décide à la visite) */
  function ligneDossier(d){ var h=ligne(d); return origineAgence(d)?h.replace(/Pas de fourchette : [^<]*/,'À établir à la visite (dossier ouvert par l\'agence)'):h; }
  var MOI=C.conseiller==='Shawez'?'Shawez Ali':C.conseiller;
  function texteLien(prenom,lien,jours){
    return 'Bonjour'+(prenom?' '+prenom:'')+', c\'est '+MOI+'. Voici le lien de votre espace : vous y suivez votre dossier étape par étape (visite, documents, offres). Il est valable '+(jours===7?'7 jours':'24 h')+'. Une fois dedans, choisissez un mot de passe pour y revenir quand vous voulez.\n'+lien;
  }
  function blocEspace(d){
    var c=d.contact||{}, h='<div class="ee-bloc" data-bloc="espace"><p class="lab">Espace du vendeur</p>';
    if(d.compte_id){
      h+='<p class="hint" data-test="espace-etat">'+EE.esc(d.compte_email||c.email||'')+' · '+(d.en_attente?'le dossier y apparaîtra dès qu\'il aura ouvert son lien':d.compte_vu?'ouvert pour la dernière fois le '+EE.jour(d.compte_vu):'pas encore ouvert')+'</p>'+
        '<div class="acts"><button type="button" class="btn'+(d.compte_vu&&!d.en_attente?'':' btn-primary')+'" data-esp-lien>Lui envoyer le lien de son espace</button></div>'+
        '<div class="ee-esp-out" data-esp-out hidden></div>';
    } else {
      h+='<p class="hint">Ce vendeur n\'a pas encore d\'espace. Son e-mail suffit pour l\'ouvrir : il y suivra son dossier.</p>'+
        '<div class="field"><label for="ad-ee-'+d.id+'">E-mail du vendeur</label><input type="email" id="ad-ee-'+d.id+'" data-esp-email inputmode="email" autocapitalize="off" autocorrect="off" spellcheck="false" autocomplete="off" value="'+EE.esc(c.email||'')+'"></div>'+
        '<div class="acts"><button type="button" class="btn" data-esp-ouvrir>Ouvrir son espace</button></div>';
    }
    return h+'<p class="ee-err" role="alert" hidden></p><p class="ee-ok" role="status" hidden></p></div>';
  }
  function espaceMaj(row,x,n){
    ['compte_id','compte_email','compte_vu','contact','en_attente','trace'].forEach(function(k){ if(n[k]!==undefined)x[k]=n[k]; });
    var b=$('[data-bloc=espace]',row); if(b)b.outerHTML=blocEspace(x);
  }
  function espaceClic(e,row,id,x){
    var t=e.target.closest('[data-esp-lien],[data-esp-ouvrir],[data-esp-copier]'); if(!t||!x)return false;
    var zone=$('[data-bloc=espace]',row), c=x.contact||{};
    if(t.hasAttribute('data-esp-copier')){
      var lien=t.getAttribute('data-esp-copier'), fait=function(){t.textContent='Lien copié';};
      if(navigator.clipboard&&navigator.clipboard.writeText)navigator.clipboard.writeText(lien).then(fait,function(){t.textContent='Copie impossible : sélectionnez le lien ci-dessous';});
      else t.textContent='Sélectionnez le lien ci-dessous';
      return true;
    }
    if(t.hasAttribute('data-esp-ouvrir')){
      var m=$('[data-esp-email]',zone); m.value=m.value.replace(/\s+/g,'');
      if(!EE.emailOk(m.value)){zoneMsg(zone,'Indiquez l\'e-mail du vendeur : c\'est lui qui ouvre son espace.');m.focus();return true;}
      t.disabled=true;
      EE.api('/admin/dossier/espace',{body:{demande:id,email:m.value,prevenir:MAIL_CLIENTS}}).then(function(d){
        t.disabled=false;
        if(d._status!==200){zoneMsg(zone,d.error==='espace_existe'?'Ce dossier a déjà un espace : rechargez la page.':(d.error==='champs'&&NV_MSG[d.champ])||EE.messageChamp(d));return;}
        espaceMaj(row,x,d.demande);
        zoneMsg($('[data-bloc=espace]',row),'Espace ouvert'+(d.mail==='envoye'?' · le lien part par e-mail.':d.mail==='differe'?' · e-mail prévu à 8 h (rien ne part entre 21 h et 8 h).':'. Envoyez-lui son lien ci-dessus.'),true);
      });
      return true;
    }
    t.disabled=true;
    EE.api('/admin/compte/lien',{body:{id:x.compte_id,type:'acces',jours:7,demande:id}}).then(function(d){
      t.disabled=false;
      if(d._status!==200){zoneMsg(zone,d.error==='compte_agence'?'Ce dossier est rangé dans un compte de l\'agence : pas de lien à envoyer.':EE.message(d));return;}
      var out=$('[data-esp-out]',zone), txt=texteLien(c.prenom,d.lien,d.jours), wa=String(c.telephone||'').replace(/\D/g,'').replace(/^0(?=\d{9}$)/,'33'), tel=String(c.telephone||'').replace(/[^\d+]/g,''), mail=x.compte_email||c.email||'';
      zoneMsg(zone,'');
      out.hidden=false;
      out.innerHTML='<p class="ee-note">Lien prêt, valable '+(d.jours===7?'7 jours':'24 h')+'. Le message est déjà écrit : il ne reste qu\'à l\'envoyer.</p>'+
        '<div class="acts">'+(wa?'<a class="btn btn-primary" data-test="esp-wa" href="https://wa.me/'+EE.esc(wa)+'?text='+encodeURIComponent(txt)+'" target="_blank" rel="noopener">WhatsApp</a>':'')+
        (tel?'<a class="btn" data-test="esp-sms" href="sms:'+EE.esc(tel)+'?&body='+encodeURIComponent(txt)+'">SMS</a>':'')+
        (mail?'<a class="btn" data-test="esp-mail" href="mailto:'+EE.esc(mail)+'?subject='+encodeURIComponent('Votre espace')+'&body='+encodeURIComponent(txt)+'">E-mail</a>':'')+
        '<button type="button" class="btn" data-esp-copier="'+EE.esc(d.lien)+'">Copier le lien</button></div>'+
        '<p class="hint ee-esp-lien" data-test="esp-lien">'+EE.esc(d.lien)+'</p>';
    });
    return true;
  }

  /* ---------- ouvrir un dossier à la main : un vendeur venu par téléphone, une recommandation, un mandat déjà signé ---------- */
  var NV={lat:null}, nvCle=EE.uuid(), nvItems=[], nvSel=-1, nvTmr=null, nvSeq=0;
  var NV_SOURCES=['https://api-adresse.data.gouv.fr/search/','https://data.geopf.fr/geocodage/search'];
  var NV_MSG={nom_vendeur:'Indiquez son prénom ou son nom.',telephone:'Indiquez son téléphone (ou son e-mail).',email:'Cette adresse e-mail n\'est pas valide.',adresse:'Indiquez l\'adresse du bien.',surface:'La surface n\'est pas valide.',code_postal:'Choisissez l\'adresse dans la liste.',email_agence:'C\'est une adresse de l\'agence : indiquez l\'e-mail du vendeur, ou laissez vide.'};
  $('#ad-demandes .ee-tools').insertAdjacentHTML('beforeend','<button type="button" class="btn btn-primary" id="ad-nv-btn" aria-expanded="false">Ouvrir un dossier</button>');
  function nvForm(){
    var opts=Object.keys(STATUTS).filter(function(k){return k!=='pause'&&k!=='close';}).map(function(k){return '<option value="'+k+'"'+(k==='appele'?' selected':'')+'>'+EE.esc(STATUTS[k])+'</option>';}).join('');
    return '<form class="ee-card ee-nv" id="ad-nv" novalidate>'+
      '<h3>Ouvrir un dossier</h3>'+
      '<p class="meta">Pour un vendeur qui n\'est pas passé par l\'estimation en ligne : un appel, une recommandation, un mandat déjà signé. Avec son e-mail, il a son espace tout de suite.</p>'+
      '<div class="ee-2"><div class="field"><label for="nv-prenom">Prénom</label><input type="text" id="nv-prenom" autocomplete="off" maxlength="80"></div>'+
      '<div class="field"><label for="nv-nom">Nom</label><input type="text" id="nv-nom" autocomplete="off" maxlength="80"><span class="msg">Indiquez son prénom ou son nom.</span></div></div>'+
      '<div class="ee-2"><div class="field"><label for="nv-tel">Téléphone</label><input type="tel" id="nv-tel" inputmode="tel" autocomplete="off"><span class="msg">Indiquez son téléphone (ou son e-mail).</span></div>'+
      '<div class="field"><label for="nv-email">E-mail <small>(pour son espace)</small></label><input type="email" id="nv-email" inputmode="email" autocapitalize="off" autocorrect="off" spellcheck="false" autocomplete="off"><span class="msg">Cette adresse e-mail n\'est pas valide.</span></div></div>'+
      '<div class="field"><label for="nv-adresse">Adresse du bien</label><input type="text" id="nv-adresse" role="combobox" aria-expanded="false" aria-controls="nv-sugg" aria-autocomplete="list" autocomplete="off" placeholder="30 rue Bannelier, Dijon" maxlength="200"><span class="msg">Indiquez l\'adresse du bien.</span>'+
        '<ul class="ee-sugg" id="nv-sugg" role="listbox" aria-label="Adresses proposées" hidden></ul><span class="hint" id="nv-picked" hidden></span></div>'+
      '<div class="ee-2"><div class="field"><label for="nv-type">Type de bien</label><select id="nv-type"><option value="appartement">Appartement</option><option value="maison">Maison</option><option value="autre:commerce">Fonds de commerce</option><option value="autre:murs">Murs commerciaux</option><option value="autre:immeuble">Immeuble</option><option value="autre:terrain">Terrain</option><option value="autre:autre">Autre</option></select></div>'+
      '<div class="field"><label for="nv-surface">Surface en m² <small>(si vous l\'avez)</small></label><input type="number" id="nv-surface" inputmode="numeric" min="1" max="100000"><span class="msg">La surface n\'est pas valide.</span></div></div>'+
      '<div class="field"><label for="nv-statut">Où en est ce dossier</label><select id="nv-statut">'+opts+'</select></div>'+
      '<div class="field"><label for="nv-notes">Notes <small>(visibles par l\'agence seulement)</small></label><textarea id="nv-notes" maxlength="5000"></textarea></div>'+
      '<label class="ee-check-l"><input type="checkbox" id="nv-prevenir"'+(MAIL_CLIENTS?' checked':' disabled')+'>'+(MAIL_CLIENTS?'Lui envoyer le lien de son espace par e-mail':'E-mails aux vendeurs pas encore ouverts : vous lui enverrez son lien par WhatsApp, en un geste')+'</label>'+
      '<p class="ee-err" role="alert" hidden></p><p class="ee-ok" role="status" hidden></p>'+
      '<div class="acts"><button type="submit" class="btn btn-primary" id="nv-ok">Ouvrir le dossier</button><button type="button" class="btn" id="nv-annuler">Annuler</button></div>'+
    '</form>';
  }
  function nvFermer(){ var f=$('#ad-nv'); if(f)f.parentNode.removeChild(f); NV={lat:null}; nvItems=[]; $('#ad-nv-btn').setAttribute('aria-expanded','false'); }
  function nvListe(){
    var inp=$('#nv-adresse'), ul=$('#nv-sugg'); nvSel=-1; inp.removeAttribute('aria-activedescendant');
    if(!nvItems.length){ul.hidden=true;inp.setAttribute('aria-expanded','false');return;}
    ul.innerHTML=nvItems.map(function(it,k){return '<li role="option" id="nv-o'+k+'" aria-selected="false" data-k="'+k+'"><b>'+EE.esc(it.name)+'</b><span>'+EE.esc((it.postcode||'')+' '+(it.city||''))+'</span></li>';}).join('');
    ul.hidden=false; inp.setAttribute('aria-expanded','true');
  }
  function nvChercher(q){
    var n=++nvSeq, qs='?q='+encodeURIComponent(q)+'&limit=5&autocomplete=1&lat=47.32&lon=5.04';
    function essai(k){ return fetch(NV_SOURCES[k]+qs).then(function(r){if(!r.ok)throw 0;return r.json();}).catch(function(){ if(k+1<NV_SOURCES.length)return essai(k+1); throw 0; }); }
    essai(0).then(function(d){ if(n!==nvSeq||!$('#ad-nv'))return; nvItems=(d.features||[]).map(function(f){var p=f.properties;return {label:p.label,name:p.name,city:p.city,postcode:p.postcode,citycode:p.citycode,lon:f.geometry.coordinates[0],lat:f.geometry.coordinates[1]};}); nvListe(); })
      .catch(function(){ if(n!==nvSeq||!$('#ad-nv'))return; nvItems=[]; nvListe(); });
  }
  function nvChoisir(it){
    var inp=$('#nv-adresse'), pk=$('#nv-picked');
    NV={adresse:it.label,code_postal:it.postcode||'',commune:it.city||'',citycode:it.citycode||'',lat:it.lat,lon:it.lon};
    inp.value=it.label; nvItems=[]; nvListe(); EE.err(inp,false);
    pk.textContent='Adresse retenue : '+it.label; pk.hidden=false;
  }
  function nvOuvrir(){
    if($('#ad-nv')){ nvFermer(); return; }
    $('#ad-demandes .ee-tools').insertAdjacentHTML('afterend',nvForm());
    $('#ad-nv-btn').setAttribute('aria-expanded','true');
    var f=$('#ad-nv'), inp=$('#nv-adresse'), ul=$('#nv-sugg');
    inp.addEventListener('input',function(){
      NV={lat:null}; $('#nv-picked').hidden=true; clearTimeout(nvTmr); var q=inp.value.trim();
      if(q.length<3){nvItems=[];nvListe();return;}
      nvTmr=setTimeout(function(){nvChercher(q);},180);
    });
    inp.addEventListener('keydown',function(e){
      if(ul.hidden)return;
      if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();nvSel=(nvSel+(e.key==='ArrowDown'?1:-1)+nvItems.length)%nvItems.length;$$('li',ul).forEach(function(li,k){li.setAttribute('aria-selected',String(k===nvSel));});inp.setAttribute('aria-activedescendant','nv-o'+nvSel);}
      else if(e.key==='Enter'&&(nvSel>=0||nvItems.length===1)){e.preventDefault();nvChoisir(nvItems[nvSel>=0?nvSel:0]);}
      else if(e.key==='Escape'){nvItems=[];nvListe();}
    });
    ul.addEventListener('mousedown',function(e){e.preventDefault();});
    ul.addEventListener('click',function(e){var li=e.target.closest('li');if(li)nvChoisir(nvItems[+li.getAttribute('data-k')]);});
    f.addEventListener('input',function(e){ if(e.target.closest('.field.err'))EE.err(e.target,false); });
    $('#nv-annuler').addEventListener('click',nvFermer);
    f.addEventListener('submit',nvEnvoyer);
    $('#nv-prenom').focus({preventScroll:true}); f.scrollIntoView({block:'nearest',behavior:'smooth'});
  }
  function nvEnvoyer(e){
    e.preventDefault();
    var f=$('#ad-nv'), ok=true, v=function(k){return $('#nv-'+k).value.trim();};
    $('#nv-email').value=$('#nv-email').value.replace(/\s+/g,'');
    ok=EE.err($('#nv-nom'),!v('prenom')&&!v('nom'))&&ok;
    ok=EE.err($('#nv-tel'),v('tel')?!EE.telOk(v('tel')):!v('email'))&&ok;
    ok=EE.err($('#nv-email'),!!v('email')&&!EE.emailOk(v('email')))&&ok;
    ok=EE.err($('#nv-adresse'),v('adresse').length<3)&&ok;
    ok=EE.err($('#nv-surface'),!!v('surface')&&!(+v('surface')>=1&&+v('surface')<=100000))&&ok;
    if(!ok){var k=f.querySelector('.field.err input');if(k)k.focus();return;}
    var type=$('#nv-type').value.split(':'), choisie=NV.lat!=null;
    // adresse non choisie dans la liste : gardée telle qu'écrite (sans repère, pas de ventes comparables automatiques)
    var bien={type:type[0],autre_type:type[1]||undefined,adresse:choisie?NV.adresse:v('adresse'),code_postal:choisie?NV.code_postal:'',commune:choisie?NV.commune:'',citycode:choisie?NV.citycode:'',lat:choisie?NV.lat:null,lon:choisie?NV.lon:null,surface:v('surface')||null};
    var b=$('#nv-ok'); b.disabled=true; zoneMsg(f,'');
    EE.api('/admin/dossier',{body:{contact:{prenom:v('prenom'),nom:v('nom'),telephone:v('tel'),email:v('email')},bien:bien,statut:$('#nv-statut').value,notes:$('#nv-notes').value,prevenir:$('#nv-prevenir').checked,cle:nvCle,site:C.site||undefined}}).then(function(d){
      b.disabled=false;
      if(d._status!==201&&d._status!==200){zoneMsg(f,(d.error==='champs'&&NV_MSG[d.champ])||EE.messageChamp(d));return;}
      var n=d.demande; nvCle=EE.uuid(); nvFermer();
      D=D.filter(function(k){return k.id!==n.id;}); D.unshift(n);
      // le nouveau dossier, seul à l'écran et ouvert : la suite se fait dedans (son lien, la visite, les documents)
      $('#ad-q').value=n.reference; $('#ad-statut').value=''; $('#ad-site').value='';
      stats(); filtrer();
      var row=$('#ad-rows details[data-id="'+n.id+'"]'); if(!row)return;
      row.open=true;
      zoneMsg($('[data-bloc=espace]',row),'Dossier ouvert'+(d.mail==='envoye'?' · le lien de son espace part par e-mail.':d.mail==='differe'?' · e-mail au vendeur prévu à 8 h (rien ne part entre 21 h et 8 h).':n.compte_id?'. Envoyez-lui le lien de son espace.':'. Ajoutez son e-mail pour lui ouvrir son espace.'),true);
      row.scrollIntoView({block:'start',behavior:'smooth'});
    });
  }
  $('#ad-nv-btn').addEventListener('click',nvOuvrir);

  /* connexion sans mot de passe : l'agence demande son lien ici, il rouvre cette page (c'est aussi l'entrée des agents) */
  $('#ad-lien').addEventListener('submit',function(e){
    e.preventDefault(); var f=this, m=$('#ad-email'), b=$('#ad-lien-btn'); m.value=m.value.replace(/\s+/g,'');
    if(!EE.err(m,!EE.emailOk(m.value))){m.focus();return;}
    zoneMsg(f,''); b.disabled=true;
    EE.api('/lien',{body:{email:m.value,vers:'admin',site:C.site||undefined}}).then(function(d){
      b.disabled=false;
      if(d._status!==200){zoneMsg(f,EE.messageChamp(d));return;}
      if(d.envoye)zoneMsg(f,'Si cette adresse est celle de l\'agence, un lien vient d\'y être envoyé. Il ouvre l\'espace agence, dure 30 minutes et ne sert qu\'une fois.',true);
      else zoneMsg(f,'L\'envoi de liens vers cette adresse n\'est pas encore ouvert. Connectez-vous avec votre mot de passe.');
    });
  });
  /* arrivée depuis l'e-mail d'alerte : /admin/?q=<référence> ; depuis le lien de connexion : /admin/?lien=<jeton> */
  // (arrivée depuis une alerte : seule la référence compte, les filtres de la dernière fois sont levés pour la voir)
  var qs0=new URLSearchParams(location.search), q0=qs0.get('q'); if(q0){$('#ad-q').value=q0;RAPIDE='';$('#ad-site').value='';$('#ad-essais').checked=false;$('#ad-statut').removeAttribute('data-garde');}
  // le lien reçu est retiré de l'adresse tout de suite (historique, captures, favoris)
  var jeton0=qs0.get('lien')||''; if(jeton0){ qs0.delete('lien'); try{history.replaceState(null,'',location.pathname+(qs0.toString()?'?'+qs0.toString():''));}catch(e){} }
  if(jeton0){
    EE.api('/lien/ouvrir',{body:{jeton:jeton0}}).then(function(d){
      EE.pictogramme();
      charger().then(function(){ if(d._status!==200&&!$('#ad-no').hidden)zoneMsg($('#ad-lien'),d.error==='jeton'?'Ce lien de connexion n\'est plus valable : il dure 30 minutes et ne sert qu\'une fois. Demandez-en un nouveau.':EE.message(d)); });
    });
  } else charger();
})();

  }
  else if(page==="promesses"){
/* /admin/promesses/ : les 7 promesses faites au vendeur, sur 7 et 30 jours — tenue ou ratée, délai médian,
   et la liste de ce qu'il faut regarder. Tout est calculé par l'API (/admin/promesses) sur les dossiers et leur journal. */
(function(){
  'use strict';
  var $=EE.$, $$=EE.$$, C=EE.CONF, esc=EE.esc;
  var T=null, JOURS=7;
  $$('[data-ee-lien]').forEach(function(a){var k=a.getAttribute('data-ee-lien');if(C[k])a.href=C[k];});

  var ETATS={tenue:['ok','Tenue'],ratee:['ko','Ratée'],en_cours:['att','En cours'],vide:['','Pas encore de mesure']};
  function s(n,mot){ return n+' '+mot+(n>1?'s':''); }
  function debutDans(m){ return new Date(m.debut).getTime()>=new Date(T.calcule_le).getTime()-JOURS*86400000; }
  function chiffres(b){
    var l=[];
    if(b.tenue)l.push('<span><b>'+b.tenue+'</b> '+(b.tenue>1?'tenues':'tenue')+'</span>');
    if(b.ratee)l.push('<span class="ko"><b>'+b.ratee+'</b> '+(b.ratee>1?'ratées':'ratée')+'</span>');
    if(b.en_cours)l.push('<span><b>'+b.en_cours+'</b> en cours</span>');
    return l.join('');
  }
  function carte(p){
    var b=p.periodes[JOURS], e=ETATS[b.etat]||ETATS.vide;
    var liste=(p.a_regarder||[]).filter(debutDans);
    var h='<article class="ee-card ee-prom" data-promesse="'+p.n+'" data-etat="'+b.etat+'">'+
      '<div class="ee-prom-t"><p class="ee-count">Promesse '+p.n+'</p><span class="tag '+e[0]+'" data-test="etat">'+e[1]+(b.etat==='ratee'&&b.ratee>1?'s : '+b.ratee:'')+'</span></div>'+
      '<h2>'+esc(p.titre)+'</h2>';
    if(b.etat==='vide')h+='<p class="ee-prom-vide">'+(b.hors?s(b.hors,'dossier')+' hors mesure sur cette période.':'Rien à mesurer sur cette période.')+'</p>';
    else{
      h+='<p class="ee-prom-n" data-test="chiffres">'+chiffres(b)+'</p>';
      var lignes=[];
      if(b.taux!=null)lignes.push(['Tenue',b.tenue+' fois sur '+(b.tenue+b.ratee)+' ('+b.taux+' %)']);
      if(b.mediane_txt)lignes.push(['Délai médian',b.mediane_txt]);
      if(b.hors)lignes.push(['Hors mesure',s(b.hors,'dossier')]);
      if(lignes.length)h+='<ul class="ee-kv">'+lignes.map(function(x){return '<li><span>'+x[0]+'</span><span data-test="'+(x[0]==='Délai médian'?'mediane':x[0]==='Tenue'?'taux':'hors')+'">'+esc(x[1])+'</span></li>';}).join('')+'</ul>';
    }
    if(liste.length){
      var nr=liste.filter(function(m){return m.resultat==='ratee';}).length;
      h+='<details class="ee-prom-liste"'+(nr?' open':'')+'><summary>'+(nr?'Voir '+(nr>1?'les '+nr+' ratées':'la ratée')+(liste.length>nr?' et '+(liste.length-nr)+' en cours':''):'Voir '+(liste.length>1?'les '+liste.length:'le dossier')+' en cours')+'</summary><ul class="ee-items">'+
        liste.map(function(m){
          return '<li><p class="t"><b>'+esc(m.vendeur||m.reference||'Dossier')+(m.commune?' · '+esc(m.commune):'')+'</b><span class="tag '+(m.resultat==='ratee'?'ko':'att')+'">'+(m.resultat==='ratee'?'Ratée':'En cours')+'</span></p>'+
            '<p class="meta">'+[m.detail,m.delai_txt,m.date===''?'':m.date?'visite du '+EE.jourLong(m.date):EE.quandCourt(m.debut)].filter(Boolean).map(esc).join(' · ')+'</p>'+
            (m.reference?'<div class="ee-links"><a href="'+esc(C.admin)+'?q='+encodeURIComponent(m.reference)+'">Ouvrir le dossier</a></div>':'')+'</li>';
        }).join('')+'</ul></details>';
    }
    h+='<p class="meta">'+esc(p.regle)+'</p></article>';
    return h;
  }
  function dessiner(){
    var l=T.promesses, n=function(e){return l.filter(function(p){return p.periodes[JOURS].etat===e;}).length;};
    var tenues=n('tenue'), ratees=n('ratee'), reste=l.length-tenues-ratees;
    $('#pr-stats').innerHTML=[[tenues,tenues>1?'Tenues':'Tenue','tenues'],[ratees,ratees>1?'Ratées':'Ratée','ratees'],[reste,'En attente','reste']].map(function(x){return '<div class="ee-stat'+(x[2]==='ratees'&&x[0]?' ko':'')+'" data-test="'+x[2]+'"><b>'+x[0]+'</b><span>'+x[1]+'</span></div>';}).join('');
    $('#pr-cartes').innerHTML=l.map(carte).join('');
    var al=$('#pr-alerte');
    if(!T.email_clients){ al.hidden=false; al.innerHTML='<b>La promesse 7 ne peut pas être tenue aujourd\'hui :</b> les e-mails aux vendeurs ne sont pas encore ouverts. Chaque changement de statut compte donc comme raté.'; } else al.hidden=true;
    $('#pr-pied').textContent='Calculé le '+EE.quand(T.calcule_le)+', sur ce qui est noté dans les dossiers. Les essais ne comptent pas.';
    $('#pr-export').href=C.api+'/admin/promesses.csv?jours='+JOURS;
    $$('[data-jours]').forEach(function(b){b.setAttribute('aria-pressed',String(+b.getAttribute('data-jours')===JOURS));});
  }
  $$('[data-jours]').forEach(function(b){b.addEventListener('click',function(){JOURS=+b.getAttribute('data-jours');if(T)dessiner();});});

  EE.api('/admin/promesses').then(function(d){
    $('#pr-load').hidden=true;
    if(d._status!==200||!d.promesses){
      $('#pr-no').hidden=false;
      if(d.error==='interdit')$('#pr-no-txt').textContent='Ce compte n\'a pas accès à l\'espace agence.';
      else if(d.error==='admin_non_verifie')$('#pr-no-txt').textContent='Votre adresse doit être confirmée : demandez votre lien de connexion depuis l\'espace agence.';
      else if(d._status!==401&&d._status!==403)$('#pr-no-txt').textContent=EE.message(d);
      return;
    }
    T=d; $('#pr-in').hidden=false; dessiner();
  });
})();

  }
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',demarrer); else demarrer();
})();
