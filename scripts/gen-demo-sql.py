# Génère supabase/migrations/..._demo_content.sql (données de démonstration).
# Toutes les lignes sont marquées is_demo = true et affichées comme telles dans l'interface.
U = lambda i: f"https://images.unsplash.com/photo-{i}?w=900&q=70&auto=format&fit=crop"
def q(s):
    return "null" if s is None else "'" + str(s).replace("'", "''") + "'"
def arr(xs):
    return "array[" + ",".join(q(x) for x in xs) + "]::text[]" if xs else "'{}'::text[]"
def pid(n): return f"'d0000000-0000-4000-8000-{n:012d}'"

partners = [
 (1,"Saveurs de Kaloum","restauration","Kaloum","Cuisine guinéenne et africaine, plats du jour et grillades.","1517248135467-4c7edcad34c4"),
 (2,"Café Taouyah","restauration","Taouyah","Café-lounge avec Wi-Fi, idéal pour réviser entre amis.","1495474472287-4d71bcdd2085"),
 (3,"Burger Corner Kipé","restauration","Kipé","Burgers, frites maison et jus naturels.","1568901346375-23c9450c58cd"),
 (4,"FitZone Ratoma","sport","Ratoma","Salle de sport équipée : musculation, cardio et cours collectifs.","1534438327276-14e5300c3a48"),
 (5,"TechPoint Matam","tech","Matam","Réparation de smartphones et d'ordinateurs, accessoires.","1498050108023-c5249f4df085"),
 (6,"Style Dixinn","shopping","Dixinn","Boutique de mode urbaine homme et femme.","1441986300917-64674bd600d8"),
 (7,"Académie Code Conakry","formation","Kipé","Formations pratiques en développement web, data et bureautique.","1522202176988-66273c2fd55f"),
 (8,"CinéClub Kaloum","loisirs","Kaloum","Projections, avant-premières et soirées cinéma.","1489599849927-2ee91cede3ba"),
 (9,"Yéla Mobilité","transport","Conakry","Service de taxi-moto et de livraison à la demande.","1558981806-ec527fa84c39"),
 (10,"Pharma Plus Camayenne","sante","Camayenne","Pharmacie et parapharmacie, conseils santé.","1576091160399-112ba8d25d1d"),
 (11,"Librairie Horizon","formation","Dixinn","Livres universitaires, romans et fournitures.","1512820790803-83ca734da794"),
 (12,"NetZone Data","tech","Kaloum","Forfaits internet mobile et box pour la maison.","1511707171634-5f897ff02aa9"),
]
deals = [
 (1,"-20 % sur tous les plats","-20 %","Valable sur la carte, midi et soir.","Sur présentation de la carte Uny vérifiée. Hors boissons alcoolisées. 1 utilisation par jour.","2027-03-31",True,"1504674900247-0877df9cc836"),
 (1,"Menu étudiant à 35 000 GNF","35 000 GNF","Plat du jour + boisson à prix étudiant, du lundi au vendredi.","Du lundi au vendredi de 12 h à 15 h.","2027-01-31",False,"1546069901-ba9599a7e63c"),
 (2,"Café + viennoiserie à -25 %","-25 %","La formule parfaite pour tes matinées de révision.","Avant 11 h. Carte Uny vérifiée demandée en caisse.","2027-02-28",True,"1495474472287-4d71bcdd2085"),
 (2,"-10 % sur toute la carte","-10 %","Wi-Fi gratuit et prises disponibles pour travailler.","Valable tous les jours sauf samedi soir.","2027-06-30",False,"1512621776951-a57141f2eefd"),
 (3,"Burger étudiant à -15 %","-15 %","Tous les burgers de la carte à prix réduit.","Sur place ou à emporter.","2026-12-31",False,"1568901346375-23c9450c58cd"),
 (3,"Boisson offerte pour 2 menus","1 boisson offerte","Viens à deux, une boisson est offerte.","Pour l'achat de 2 menus. Non cumulable.","2026-12-31",False,"1565299624946-b28f40a0ae38"),
 (4,"Abonnement mensuel à -30 %","-30 %","Accès illimité à la salle et aux cours collectifs.","Engagement d'un mois minimum. Carte Uny vérifiée obligatoire.","2027-06-30",True,"1571019613454-1cb2f99b2d8b"),
 (4,"Séance d'essai gratuite","Gratuit","Découvre la salle avec un coach pendant une séance.","Une seule séance d'essai par étudiant.","2027-06-30",False,"1517836357463-d25dfeac3438"),
 (5,"Réparation smartphone à -20 %","-20 %","Écran, batterie, connecteur : diagnostic gratuit.","Hors pièces premium. Garantie 1 mois.","2027-03-31",False,"1592899677977-9c10ca588bbd"),
 (5,"Accessoires à -15 %","-15 %","Chargeurs, écouteurs, coques et câbles.","Dans la limite des stocks.","2026-12-31",False,"1505740420928-5e560c06d30e"),
 (6,"-15 % sur la nouvelle collection","-15 %","Streetwear, pagnes modernes et accessoires.","Hors articles déjà soldés.","2027-01-31",True,"1523381210434-271e8be1f52b"),
 (7,"Formation développement web à -40 %","-40 %","3 mois pour apprendre HTML, CSS, JavaScript et créer ton portfolio.","Sur inscription, places limitées par session.","2027-02-28",True,"1522202176988-66273c2fd55f"),
 (7,"Atelier Excel gratuit","Gratuit","Atelier de 3 h chaque samedi pour maîtriser Excel.","Inscription obligatoire, 20 places par atelier.","2026-12-31",False,"1524178232363-1fb2b075b655"),
 (8,"Place de cinéma à -30 %","-30 %","Tarif étudiant sur toutes les séances de la semaine.","Du lundi au jeudi. Hors avant-premières.","2027-06-30",False,"1489599849927-2ee91cede3ba"),
 (9,"-20 % sur tes courses taxi-moto","-20 %","Réduction sur les trajets vers les campus de Conakry.","5 courses réduites par semaine maximum.","2027-03-31",False,"1558981806-ec527fa84c39"),
 (10,"-10 % en parapharmacie","-10 %","Soins, hygiène et produits de bien-être.","Hors médicaments sur ordonnance.","2027-06-30",False,"1505751172876-fa1923c5c528"),
 (11,"Livres universitaires à -15 %","-15 %","Droit, économie, médecine, informatique…","Sur les livres neufs uniquement.","2027-01-31",False,"1495446815901-a7297e633e8d"),
 (12,"Forfait internet étudiant à -25 %","-25 %","Plus de data pour tes cours en ligne et tes révisions.","Offre réservée aux étudiants vérifiés, 1 forfait par mois.","2027-06-30",True,"1511707171634-5f897ff02aa9"),
]
cat_of = {p[0]: p[2] for p in partners}
dist_of = {p[0]: p[3] for p in partners}

jobs = [
 ("NetZone Data",12,"Commercial étudiant (temps partiel)","job","Kaloum",False,"1 500 000 GNF/mois + commissions","Tu présentes nos forfaits internet sur les campus et dans les quartiers. Horaires flexibles compatibles avec les cours.",["Communication","Négociation","Aisance à l'oral"],"2026-11-30"),
 ("Kaloum Digital",None,"Community Manager junior","freelance","Kaloum",True,"800 000 GNF/mois","Animation des réseaux sociaux de 3 marques locales : planning éditorial, visuels simples, réponses aux messages.",["Réseaux sociaux","Canva","Rédaction"],"2026-11-15"),
 ("Cabinet Nimba Conseil",None,"Assistant administratif","job","Dixinn",False,"1 200 000 GNF/mois","Accueil, classement, saisie de documents et suivi des rendez-vous, 3 jours par semaine.",["Word","Excel","Organisation"],"2026-11-20"),
 ("Fouta Agro",None,"Stage marketing","stage","Matam",False,"Indemnité de stage","Participe au lancement d'une gamme de jus locaux : études terrain, communication, événements.",["Marketing","Études de marché","Créativité"],"2026-12-15"),
 ("Microfinance Espoir",None,"Stage finance","stage","Kaloum",False,"Indemnité de stage","Analyse de dossiers de crédit, suivi du portefeuille clients et reporting mensuel.",["Comptabilité","Excel","Rigueur"],"2026-12-01"),
 ("Wakilé Tech",None,"Développeur web junior","alternance","Kipé",False,"2 000 000 GNF/mois","Rejoins une startup qui construit des outils de paiement pour commerçants. Stack : React, Node.js.",["JavaScript","React","Git"],"2026-12-31"),
 ("Yéla Mobilité",9,"Livreur à temps partiel","job","Ratoma",False,"Rémunération à la course","Livraisons dans Ratoma et Dixinn en soirée et le week-end. Moto fournie.",["Permis moto","Ponctualité"],"2026-11-10"),
 ("Saveurs de Kaloum",1,"Serveur / Serveuse le week-end","job","Kaloum",False,"600 000 GNF/mois","Service en salle le samedi et le dimanche, ambiance jeune et dynamique.",["Service client","Sourire"],"2026-11-05"),
 ("Média Conakry Jeunes",None,"Rédacteur web freelance","freelance","Conakry",True,"150 000 GNF/article","Rédaction d'articles sur la vie étudiante, l'emploi et l'entrepreneuriat en Guinée.",["Rédaction","Orthographe","SEO"],"2026-12-20"),
 ("Association Lire Ensemble",None,"Bénévole soutien scolaire","benevolat","Matoto",False,None,"Aide aux devoirs pour des collégiens deux après-midis par semaine. Attestation de bénévolat fournie.",["Pédagogie","Patience"],"2026-12-31"),
 ("Incubateur Kobi Lab",None,"Concours d'innovation étudiante","concours","Conakry",False,"Prix de 10 000 000 GNF","Présente ton projet d'entreprise devant un jury. Accompagnement de 6 mois pour les lauréats.",["Entrepreneuriat","Pitch"],"2026-12-10"),
 ("Fondation Horizon Afrique",None,"Bourse d'excellence Master","bourse","Conakry",False,"Frais de scolarité + allocation","Bourse pour les étudiants en fin de Licence avec un excellent dossier académique.",["Dossier académique","Lettre de motivation"],"2027-01-15"),
 ("Académie Code Conakry",7,"Formation certifiante Data Analyst","formation","Kipé",False,"Tarif étudiant","12 semaines pour apprendre Excel avancé, SQL et Power BI, avec projet final.",["Logique","Excel"],"2026-11-25"),
 ("Groupe Sabou Logistique",None,"Stage ressources humaines","stage","Matoto",False,"Indemnité de stage","Recrutement, gestion administrative du personnel et organisation de formations internes.",["RH","Communication","Excel"],"2026-12-05"),
 ("Institut Sondage Plus",None,"Enquêteur terrain (étude de marché)","job","Conakry",False,"100 000 GNF/jour","Mission de 2 semaines : interroger des consommateurs sur tablette dans différents quartiers.",["Aisance relationnelle","Soussou ou Poular apprécié"],"2026-10-31"),
]

housing = [
 ("Chambre meublée proche de l'UGANC","chambre","Dixinn",600000,1,"Chambre meublée dans une maison calme, à 10 min à pied de l'université. Eau et électricité incluses.",["Meublé","Eau incluse","Électricité incluse"],["1505691938895-1758d7feb511","1540518614846-7eded433c457"],"2026-10-15"),
 ("Studio moderne à Kipé","studio","Kipé",1800000,1,"Studio rénové avec coin cuisine et douche, gardien et groupe électrogène.",["Groupe électrogène","Gardien","Cuisine équipée"],["1522708323590-d24dbb6b0267","1484154218962-a197022b5858"],"2026-11-01"),
 ("Colocation étudiante 3 chambres","colocation","Taouyah",900000,3,"Une chambre disponible dans une colocation de 3 étudiants. Salon et cuisine partagés.",["Wi-Fi","Salon partagé","Cuisine"],["1502672260266-1c1ef2d93688","1554995207-c18c203602cb"],"2026-10-10"),
 ("Appartement 2 chambres à Lambanyi","appartement","Lambanyi",3000000,3,"Appartement lumineux au 1er étage, idéal pour une colocation à deux.",["2 chambres","Balcon","Parking"],["1493809842364-78817add7ffb","1560448204-e02f11c3d0e2"],"2026-11-15"),
 ("Chambre simple près de l'UGLC","chambre","Sonfonia",450000,1,"Chambre simple et propre à proximité du campus de Sonfonia.",["Proche campus","Eau incluse"],["1631049307264-da0ec9d70304"],"2026-10-05"),
 ("Studio à Camayenne","studio","Camayenne",2200000,1,"Studio meublé dans une résidence sécurisée, à 5 min de la corniche.",["Meublé","Climatisation","Sécurisé"],["1586023492125-27b2c045efd7","1507089947368-19c1da9775ae"],"2026-12-01"),
 ("Colocation entre étudiantes","colocation","Hamdallaye",750000,4,"Colocation réservée aux étudiantes dans un appartement de 4 chambres.",["Wi-Fi","Colocation féminine","Cuisine"],["1512918728675-ed5a9ecdebfd","1536376072261-38c75010e6c9"],"2026-10-20"),
 ("Appartement 3 pièces à Kaporo","appartement","Kaporo",3800000,3,"Grand appartement avec salon, 2 chambres et cuisine, dans un quartier calme.",["Salon","Cuisine","Parking"],["1524758631624-e2822e304c36","1554995207-c18c203602cb"],"2027-01-05"),
 ("Chambre avec douche interne","chambre","Nongo",700000,1,"Chambre avec douche interne dans une concession familiale.",["Douche interne","Calme"],["1540518614846-7eded433c457"],"2026-10-25"),
 ("Studio meublé à Matam","studio","Matam",1500000,1,"Studio meublé proche des axes de transport, accès facile à Kaloum.",["Meublé","Proche transports"],["1505691938895-1758d7feb511","1484154218962-a197022b5858"],"2026-11-10"),
]

market = [
 ("iPhone 11 64 Go","smartphones",2800000,True,"bon_etat","Batterie 84 %, écran sans rayure, vendu avec coque et chargeur.","Kipé",["1592899677977-9c10ca588bbd"]),
 ("Samsung Galaxy A34","smartphones",2200000,True,"comme_neuf","Acheté il y a 6 mois, sous garantie, double SIM.","Ratoma",["1598327105666-5b89351aff97"]),
 ("HP EliteBook i5 8 Go RAM","informatique",3500000,True,"bon_etat","Idéal pour les cours et la bureautique. SSD 256 Go.","Dixinn",["1496181133206-80ce9b88a853"]),
 ("MacBook Air 2017","informatique",4800000,False,"usage","Fonctionne parfaitement, quelques traces d'usure sur la coque.","Kaloum",["1517336714731-489689fd1ca8"]),
 ("Clavier sans fil","informatique",150000,False,"comme_neuf","Clavier AZERTY sans fil, piles incluses.","Matam",["1587829741301-dc798b83add3"]),
 ("Écran 24 pouces","informatique",1200000,True,"bon_etat","Écran Full HD, câble HDMI fourni.","Taouyah",["1527443224154-c4a3942d3acf"]),
 ("Lot de livres de droit L1","livres",250000,True,"bon_etat","Droit constitutionnel, introduction au droit, droit civil. Annotés au crayon.","Dixinn",["1495446815901-a7297e633e8d"]),
 ("Manuels de médecine","livres",400000,False,"bon_etat","Anatomie et physiologie, 2 volumes.","Hamdallaye",["1544947950-fa07a98d237f"]),
 ("Lot de romans","livres",100000,True,"usage","8 romans africains et classiques français.","Kaporo",["1512820790803-83ca734da794"]),
 ("Calculatrice scientifique","fournitures",180000,False,"comme_neuf","Autorisée aux examens, avec étui.","Sonfonia",["1513542789411-b6a5d4f31634"]),
 ("Cahiers et fournitures","fournitures",80000,False,"neuf","Lot de 10 cahiers grand format, stylos et surligneurs.","Nongo",["1531346878377-a5be20888e57","1456735190827-d1262f71b8a3"]),
 ("Sac à dos pour ordinateur","mode",200000,False,"comme_neuf","Compartiment 15 pouces, imperméable.","Kipé",["1553062407-98eeb64c6a62"]),
 ("Baskets running taille 42","mode",350000,True,"bon_etat","Portées quelques fois, très confortables.","Lambanyi",["1542291026-7eec264c27ff"]),
 ("Lot de t-shirts","mode",120000,False,"neuf","5 t-shirts coton, tailles M et L.","Matoto",["1521572163474-6864f9cf17ab"]),
 ("Canapé 3 places","maison",1500000,True,"bon_etat","Canapé confortable, à récupérer sur place.","Kaporo",["1555041469-a586c61ea9bc"]),
 ("Bureau + chaise","maison",900000,True,"bon_etat","Parfait pour étudier dans ta chambre.","Camayenne",["1518455027359-f3f8164ba6bd"]),
 ("Vélo de ville","transport",1100000,True,"bon_etat","Vélo révisé, freins neufs.","Kaloum",["1485965120184-e220f721d03e"]),
 ("Casque audio Bluetooth","informatique",300000,False,"comme_neuf","Réduction de bruit, 20 h d'autonomie.","Taouyah",["1505740420928-5e560c06d30e"]),
 ("Tablette 10 pouces","informatique",1600000,True,"bon_etat","Idéale pour lire les cours en PDF.","Ratoma",["1544244015-0df4b3ffc6b0"]),
 ("Appareil photo Sony + objectifs","autres",3200000,True,"bon_etat","Pour la photo et la vidéo, 2 objectifs inclus.","Dixinn",["1516035069371-29a1b244cc32"]),
]

out = []
out.append("-- =============================================================================")
out.append("-- UNY — contenu de DÉMONSTRATION (version pilote)")
out.append("-- Toutes les entreprises ci-dessous sont FICTIVES : is_demo = true.")
out.append("-- L'interface les signale par un badge « Démo ». Aucun partenariat réel n'est")
out.append("-- revendiqué. L'administrateur peut tout supprimer en un clic (Admin > Données démo).")
out.append("-- Généré par scripts/gen-demo-sql.py")
out.append("-- =============================================================================\n")
out.append("do $$\ndeclare v_city integer;\nbegin\nselect id into v_city from public.cities where slug = 'conakry';\n")
out.append("insert into public.partners (id, name, category, logo_url, description, city_id, district, is_demo) values")
out.append(",\n".join(f"  ({pid(n)}, {q(name)}, {q(cat)}, {q(U(img))}, {q(desc)}, v_city, {q(d)}, true)" for n,name,cat,d,desc,img in partners) + ";\n")
out.append("insert into public.deals (partner_id, title, discount_label, category, description, conditions, city_id, district, image_url, valid_until, is_featured, is_demo, created_at) values")
rows=[]
for i,(p,t,lab,desc,cond,until,feat,img) in enumerate(deals):
    rows.append(f"  ({pid(p)}, {q(t)}, {q(lab)}, {q(cat_of[p])}, {q(desc)}, {q(cond)}, v_city, {q(dist_of[p])}, {q(U(img))}, {q(until)}, {str(feat).lower()}, true, now() - interval '{i*9} hours')")
out.append(",\n".join(rows)+";\n")
out.append("insert into public.jobs (company_name, partner_id, title, type, city_id, location, is_remote, compensation, description, skills, deadline, apply_email, is_demo, created_at) values")
rows=[]
for i,(comp,p,t,ty,loc,rem,pay,desc,skills,dl) in enumerate(jobs):
    rows.append(f"  ({q(comp)}, {pid(p) if p else 'null'}, {q(t)}, {q(ty)}, v_city, {q(loc)}, {str(rem).lower()}, {q(pay)}, {q(desc)}, {arr(skills)}, {q(dl)}, null, true, now() - interval '{i*7} hours')")
out.append(",\n".join(rows)+";\n")
out.append("insert into public.housing (title, type, city_id, district, price_gnf, rooms, description, amenities, images, available_from, contact_name, contact_phone, is_demo, created_at) values")
rows=[]
for i,(t,ty,d,price,rooms,desc,am,imgs,av) in enumerate(housing):
    rows.append(f"  ({q(t)}, {q(ty)}, v_city, {q(d)}, {price}, {rooms}, {q(desc)}, {arr(am)}, {arr([U(x) for x in imgs])}, {q(av)}, null, null, true, now() - interval '{i*11} hours')")
out.append(",\n".join(rows)+";\n")
out.append("end $$;\n")
out.append("-- Marketplace (annonces d'exemple, sans vendeur réel)")
for i,(t,cat,price,neg,cond,desc,d,imgs) in enumerate(market):
    mid = f"'e0000000-0000-4000-8000-{i+1:012d}'"
    out.append(f"insert into public.marketplace_items (id, seller_id, title, category, price_gnf, is_negotiable, condition, description, city_id, district, is_demo, created_at) select {mid}, null, {q(t)}, {q(cat)}, {price}, {str(neg).lower()}, {q(cond)}, {q(desc)}, id, {q(d)}, true, now() - interval '{i*5} hours' from public.cities where slug = 'conakry';")
    for j,img in enumerate(imgs):
        out.append(f"insert into public.marketplace_images (item_id, url, position) values ({mid}, {q(U(img))}, {j});")
open("supabase/migrations/20260929000003_demo_content.sql","w").write("\n".join(out)+"\n")
print("ok")
