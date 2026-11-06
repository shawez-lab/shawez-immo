#!/bin/bash
# Refaire les masters sociaux depuis les ORIGINAUX retrouvés dans l'archive du Mac (06/11/2026).
#
# Pourquoi. Shawez : « la qualité des vidéos publiées sur TikTok est pourrie ». Mesuré : le duplex 415
# partait en 360x640 et neuf autres biens en 720. Ces fichiers-là venaient de copies Instagram
# dégradées. Les originaux existent dans « GRAVELIN IMMO - Médias site », jusqu'en 1440x2560, et
# personne ne les avait jamais ouverts. Les retrouver s'est fait par le dossier _meta de l'archive
# Instagram, qui porte la correspondance post_shortcode -> identifiant du fichier.
#
# À lancer SUR LE MAC (le shell du pont), dossiers connectés montés sous ~/mnt.
# Les découpes (début, durée, recadrage du bandeau) sont reprises telles quelles de
# outils/biens/medias.json : elles ont été décidées bien par bien, on n'y touche pas.
# Les fichiers sortent dans ~/mnt/TrialReels-Studio/work/masters-20261106, à rapatrier ensuite
# dans assets/biens/<ref>/video-hd.mp4.
set -e
M="$HOME/mnt/GRAVELIN IMMO - Médias site/instagram-gravelin_immo/videos"
Y="$HOME/mnt/GRAVELIN IMMO - Médias site/youtube/shorts"
O="$HOME/mnt/TrialReels-Studio/work/masters-20261106"
mkdir -p "$O"

# src dst debut duree recadrage_haut crf — mêmes réglages que encode_hd() de outils/biens/video.py
enc(){
  vf=""; [ "$5" != "0" ] && vf="crop=iw:ih*(1-$5):0:ih*$5,"
  vf="${vf}scale='min(1080,iw)':-2:flags=lanczos,fps=30"
  ffmpeg -v error -y -ss "$3" -i "$1" -t "$4" -vf "$vf" -c:v libx264 -profile:v high -level 4.2 \
    -pix_fmt yuv420p -preset slow -crf "$6" -maxrate 16M -bufsize 32M -g 60 \
    -c:a aac -b:a 192k -ac 2 -movflags +faststart "$2"
  printf '%-12s %s  %s octets\n' "$(basename "$2")" \
    "$(ffprobe -v error -select_streams v:0 -show_entries stream=width,height -of csv=p=0:nk=1 "$2")" \
    "$(stat -c%s "$2")"
}
# copie des flux : la source est déjà en 1080, propre, et aucun recadrage n'est demandé
cop(){
  ffmpeg -v error -y -ss "$3" -i "$1" -t "$4" -c copy -movflags +faststart "$2"
  printf '%-12s %s  %s octets (copie, image intacte)\n' "$(basename "$2")" \
    "$(ffprobe -v error -select_streams v:0 -show_entries stream=width,height -of csv=p=0:nk=1 "$2")" \
    "$(stat -c%s "$2")"
}

cop "$M/3997119528252608453.mp4" "$O/506-video-hd.mp4"          8  19           # 1080x1920, Dd4nwiGRg_F
cop "$M/3995553683813898599.mp4" "$O/512-video-hd.mp4"          8  24           # 1080x1920, DdzDuf0uxln
enc "$M/3921568712639100366.mp4" "$O/452IMMEUBLE-video-hd.mp4" 33.6 12.4 0    20  # 1440x2560, DZsNfd_I7XO
enc "$M/3973865376964934423.mp4" "$O/501-video-hd.mp4"         11   37   0.31 20  # 1440x2560, DcmAYGDN_sX, bandeau de l'ancien prix
enc "$M/3923825218176428683.mp4" "$O/Mandat-video-hd.mp4"      16   30   0    20  # 1440x2560, Neuilly 20/06/2026
enc "$M/3981706317897546657.mp4" "$O/508-video-hd.mp4"          0   45   0.22 20  # 1440x2560, Chenôve 08/09/2026, bandeau recadré

# 415, le duplex : la copie Instagram est en 360x640, seul YouTube en garde une version a 1080.
# Elle dure 55,6 s contre 64,7 s, mais la correlation des deux bandes son donne un decalage de
# 0,00 s et les images de 4 s, 20 s, 30 s et 43 s sont identiques : les 9 s manquantes sont a la
# FIN. Le debut de 4 s de medias.json tombe donc au meme endroit, verifie le 06/11/2026.
enc "$Y/2025-11-23 - On ne va pas se mentir…Des duplex comme ça en plein cœur de Dijon #imm [2poWaFiKV-A].mp4" \
    "$O/415-video-hd.mp4" 4 40 0 20

# Les cinq biens dont medias.json dit que la source est le Drive « SELECTION PREMIUM », jamais
# connecte. Trois ont un identifiant Instagram dans medias.json, donc l'original est dans l'archive ;
# le chateau et Plombieres n'y sont qu'en 720, mais YouTube en garde une copie 1080 de meme duree.
enc "$M/3934196127865569897.mp4" "$O/461-video-hd.mp4"      2  35.5 0 20   # DaZEoi2JQJp, 1440x2560
enc "$M/3947589276042091992.mp4" "$O/461BALI-video-hd.mp4"  4  40   0 20   # DbIp4gFoV3Y, 1440x2560
enc "$M/3921792519551194647.mp4" "$O/483-video-hd.mp4"      0  34.8 0 20   # DZtAYSaohYX, 1440x2560
enc "$Y/2026-03-16 - 16 mars 2026 [EvX3e7fvzWw].mp4"        "$O/438-video-hd.mp4" 16 30 0 20  # chateau
enc "$Y/2026-03-24 - 24 mars 2026 [EWdKX6QEkOg].mp4"        "$O/441-video-hd.mp4" 10 40 0 20  # Plombieres

# Quatre fichiers depassaient les 25 Mio de Cloudflare Pages en CRF 20 : 501, 508, 461 et 461BALI
# sont repris en deux passes vers 22 Mio. -g 60 des la premiere passe, sinon x264 refuse la seconde
# avec « different keyint setting than first pass ».
deux(){ # src dst duree recadrage_haut debut
  vb=$(python3 -c "print(int(23068672*8/$3/1000)-160)")
  vf=""; [ "$4" != "0" ] && vf="crop=iw:ih*(1-$4):0:ih*$4,"
  vf="${vf}scale='min(1080,iw)':-2:flags=lanczos,fps=30"
  ffmpeg -v error -y -ss "$5" -i "$1" -t "$3" -vf "$vf" -c:v libx264 -profile:v high -level 4.2 \
    -pix_fmt yuv420p -preset slow -b:v ${vb}k -g 60 -pass 1 -an -f mp4 /dev/null
  ffmpeg -v error -y -ss "$5" -i "$1" -t "$3" -vf "$vf" -c:v libx264 -profile:v high -level 4.2 \
    -pix_fmt yuv420p -preset slow -b:v ${vb}k -g 60 -pass 2 -c:a aac -b:a 128k -ac 2 \
    -movflags +faststart "$2"
  printf '%-22s %s  %s octets\n' "$(basename "$2")" \
    "$(ffprobe -v error -select_streams v:0 -show_entries stream=width,height -of csv=p=0:nk=1 "$2")" \
    "$(stat -c%s "$2")"; }
deux "$M/3973865376964934423.mp4" "$O/501-video-hd.mp4"     37   0.31 11
deux "$M/3981706317897546657.mp4" "$O/508-video-hd.mp4"     45   0.22 0
deux "$M/3934196127865569897.mp4" "$O/461-video-hd.mp4"     35.5 0    2
deux "$M/3947589276042091992.mp4" "$O/461BALI-video-hd.mp4" 40   0    4
