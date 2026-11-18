import { db, maintenant, sha256 } from './base.js';
// Qualification seulement : aucune coordonnée n'est déduite du texte du visiteur.
export async function enregistrerQualification(env,session,etat) {
  if(!etat.serieux || etat.intention!=='vendre') return null;
  const b=await db(env),cle='chat:'+await sha256(session),ref='CHAT-'+(await sha256(session)).slice(0,20),t=maintenant();
  const contact={prenom:etat.prenom || '',nom:'',email:'',telephone:''};
  const reponses={type:'autre',formulaire:'chat-qualification',commune:etat.secteur || '',delai:'nsp',delai_libelle:etat.echeance || '',tags:['vendeur','secteur:'+(etat.secteur || 'a_preciser'),'echeance:'+(etat.echeance || 'a_preciser')],whatsapp:false,contact_a_completer:true};
  const notes='Projet vendeur qualifié par le chatbot. Coordonnées et accord de contact à recueillir via le formulaire. Aucune séquence commerciale autorisée. Budget exprimé : '+String(etat.budget || 'non précisé').slice(0,300);
  await b.prepare(`INSERT INTO demandes(reference,compte_id,source,type,adresse,code_postal,commune,reponses,contact,cree_le,notes,cle)
    VALUES (?1,NULL,'shawez','autre','','',?2,?3,?4,?5,?6,?7)
    ON CONFLICT(cle) DO UPDATE SET commune=?2,reponses=?3,contact=?4,notes=?6,maj_le=?5`)
    .bind(ref,etat.secteur || '',JSON.stringify(reponses),JSON.stringify(contact),t,notes,cle).run();
  return ref;
}
