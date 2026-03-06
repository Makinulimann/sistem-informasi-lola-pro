UPDATE "SidebarMenus"
SET "ParentId" = (SELECT "Id" FROM "SidebarMenus" WHERE "Label" = 'Produk Pengembangan')
WHERE "Label" IN ('Aktivitas Harian', 'Maintenance');

SELECT "Id", "Label", "ParentId" FROM "SidebarMenus" WHERE "Label" IN ('Produk Pengembangan', 'Aktivitas Harian', 'Maintenance', 'Phonska Oca');
