-- Rôle « partenaire » (commerçants, bailleurs, recruteurs). Dans sa propre migration :
-- une nouvelle valeur d'enum ne peut pas être utilisée dans la transaction qui la crée.
alter type public.user_role add value if not exists 'partner';
