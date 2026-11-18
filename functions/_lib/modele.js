/* Diagnostic technique borné : jamais le corps brut du fournisseur ni les secrets. */
export async function requeteModele(url, options) {
 if(!options.headers?.['x-api-key'])throw new Error('claude cle_absente');
 let response;
 try {response=await fetch(url,{...options,signal:AbortSignal.timeout(25000)});}
 catch(e){throw new Error(e?.name==='TimeoutError'||e?.name==='AbortError'?'claude delai_depasse':'claude reseau_indisponible');}
 if(!response.ok){
  const data=await response.json().catch(()=>null);
  const type=String(data?.error?.type||'');
  const known=['authentication_error','permission_error','rate_limit_error','overloaded_error','invalid_request_error','not_found_error','api_error'];
  const reason=response.status===401&&/invalid x-api-key/i.test(String(data?.error?.message||''))?' invalid x-api-key':'';
  throw new Error(`claude ${response.status} ${known.includes(type)?type:'erreur_fournisseur'}${reason}`);
 }
 return response;
}
