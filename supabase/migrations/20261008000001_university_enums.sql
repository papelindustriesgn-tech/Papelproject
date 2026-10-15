-- Valeurs d'énumération utilisées par la migration suivante (doivent être validées dans une transaction séparée)
alter type public.user_role add value if not exists 'university';
alter type public.card_status add value if not exists 'expired';
