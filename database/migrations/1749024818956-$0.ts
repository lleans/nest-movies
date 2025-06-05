import { MigrationInterface, QueryRunner } from "typeorm";

export class  $01749024818956 implements MigrationInterface {
    name = ' $01749024818956'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`tokens\` (\`id\` bigint NOT NULL AUTO_INCREMENT, \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`deleted_at\` datetime(6) NULL, \`user_id\` bigint NOT NULL, \`token_hash\` varchar(500) NOT NULL, \`expires_at\` datetime NOT NULL, \`last_used_at\` datetime NULL, \`device_info\` varchar(255) NULL, \`ip_address\` varchar(45) NULL, INDEX \`IDX_c1973358a8590e9ae0b98f798f\` (\`deleted_at\`), UNIQUE INDEX \`IDX_989478f994a58e1a3b8b9b35a0\` (\`token_hash\`), INDEX \`IDX_2703ec1fbf4d8eecbef80cf6c3\` (\`expires_at\`), INDEX \`IDX_8769073e38c365f315426554ca\` (\`user_id\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`tags\` (\`id\` bigint NOT NULL AUTO_INCREMENT, \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`deleted_at\` datetime(6) NULL, \`name\` varchar(100) NOT NULL, \`slug\` varchar(50) NOT NULL, \`usageCount\` int NOT NULL DEFAULT '0', INDEX \`IDX_adfb05f40f5e8cdd9151ec9b53\` (\`deleted_at\`), INDEX \`IDX_6dae7c00326ec8ea5bdc9081eb\` (\`usageCount\`), INDEX \`IDX_82767dce98ac6be7db948628f9\` (\`name\`, \`deleted_at\`), UNIQUE INDEX \`IDX_d90243459a697eadb8ad56e909\` (\`name\`), UNIQUE INDEX \`IDX_b3aa10c29ea4e61a830362bd25\` (\`slug\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`movie_tags\` (\`id\` bigint NOT NULL AUTO_INCREMENT, \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`deleted_at\` datetime(6) NULL, \`movie_id\` bigint NOT NULL, \`tag_id\` bigint NOT NULL, INDEX \`IDX_6011c473fd903327af4f1379c2\` (\`deleted_at\`), INDEX \`IDX_24a395dfca2e17ce2c3aebc424\` (\`tag_id\`, \`deleted_at\`), INDEX \`IDX_edec4ee1b60017635ffe619a3f\` (\`movie_id\`, \`deleted_at\`), INDEX \`IDX_f4972e5ac13766ce20ac081cf1\` (\`tag_id\`), INDEX \`IDX_da8c59e083499f43b357ec2ed4\` (\`movie_id\`), UNIQUE INDEX \`IDX_ca891d83e843801d3be4591af4\` (\`movie_id\`, \`tag_id\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`movies\` (\`id\` bigint NOT NULL AUTO_INCREMENT, \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`deleted_at\` datetime(6) NULL, \`title\` varchar(255) NOT NULL, \`overview\` text NOT NULL, \`poster\` varchar(255) NOT NULL, \`play_until\` datetime NOT NULL, \`tmdb_id\` bigint NULL, \`searchKeywords\` varchar(255) NULL, \`rating\` decimal(3,1) NULL, INDEX \`IDX_432cbfcfa3769309747e6072f0\` (\`deleted_at\`), INDEX \`IDX_ea8b01c4ec9b4594db88656222\` (\`searchKeywords\`), INDEX \`IDX_761000fb255097da07de759f45\` (\`rating\`), INDEX \`IDX_098e37ee45c050385611f9e28c\` (\`created_at\`, \`play_until\`), INDEX \`IDX_5a94fb9eee9eefad549b336f96\` (\`title\`, \`play_until\`), INDEX \`IDX_0171a843834c9ee0a216f2ba61\` (\`play_until\`), INDEX \`IDX_5aa0bbd146c0082d3fc5a0ad5d\` (\`title\`), UNIQUE INDEX \`IDX_a30f596bb8c7b8213cec64c512\` (\`tmdb_id\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`movie_schedules\` (\`id\` bigint NOT NULL AUTO_INCREMENT, \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`deleted_at\` datetime(6) NULL, \`start_time\` datetime NOT NULL, \`end_time\` datetime NOT NULL, \`price\` decimal(10,2) NOT NULL, \`date\` date NOT NULL, \`movie_id\` bigint NOT NULL, \`studio_id\` bigint NOT NULL, \`bookedSeats\` int NOT NULL DEFAULT '0', INDEX \`IDX_310f5e3ba92f4b7d4d909f8de5\` (\`deleted_at\`), INDEX \`IDX_37a893512ee94638d5fcd02cb9\` (\`bookedSeats\`), INDEX \`IDX_50de393904101efe8146a564b2\` (\`date\`, \`movie_id\`, \`start_time\`), INDEX \`IDX_548038e544d52388b6bc133b6d\` (\`price\`), INDEX \`IDX_65b48de1e22f968da83d107651\` (\`start_time\`, \`end_time\`), INDEX \`IDX_16f279666937c413f204245108\` (\`date\`, \`start_time\`, \`deleted_at\`), INDEX \`IDX_75e2562edb5945a4bccb62e5f8\` (\`movie_id\`, \`studio_id\`, \`date\`), INDEX \`IDX_b240977f8408c2e8cf002a3756\` (\`studio_id\`, \`date\`), INDEX \`IDX_8c1f23566c3f20222e06828464\` (\`movie_id\`, \`date\`), INDEX \`IDX_ba34a2c1515e9085d6892f0bf9\` (\`date\`, \`start_time\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`studios\` (\`id\` bigint NOT NULL AUTO_INCREMENT, \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`deleted_at\` datetime(6) NULL, \`studio_number\` int NOT NULL, \`seat_capacity\` int NOT NULL, \`hasImax\` tinyint NOT NULL DEFAULT 0, \`has3D\` tinyint NOT NULL DEFAULT 0, \`isActive\` tinyint NOT NULL DEFAULT 1, INDEX \`IDX_b175c4bb74ac451432773dcca9\` (\`deleted_at\`), INDEX \`IDX_b81763fbd16e9d4c0720551386\` (\`isActive\`), INDEX \`IDX_4b1c6f3b3d3a9af0d48d63cc04\` (\`hasImax\`, \`has3D\`), INDEX \`IDX_a9bc538fc36392150e98b5ae53\` (\`seat_capacity\`), UNIQUE INDEX \`IDX_4906863a753ecb7d6078c927c5\` (\`studio_number\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`seats\` (\`id\` bigint NOT NULL AUTO_INCREMENT, \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`deleted_at\` datetime(6) NULL, \`studio_id\` bigint NOT NULL, \`row_label\` varchar(10) NOT NULL, \`seat_number\` int NOT NULL, INDEX \`IDX_ee1339afeb408d5dce8bba70c3\` (\`deleted_at\`), INDEX \`IDX_59d2dba05c887c4be783b7eda1\` (\`studio_id\`, \`id\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`order_items\` (\`id\` bigint NOT NULL AUTO_INCREMENT, \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`deleted_at\` datetime(6) NULL, \`order_id\` bigint NOT NULL, \`movie_schedule_id\` bigint NOT NULL, \`seat_id\` bigint NOT NULL, \`qty\` int NOT NULL DEFAULT '1', \`price\` decimal(10,2) NOT NULL, \`sub_total_price\` decimal(10,2) NOT NULL, \`status\` enum ('CONFIRMED', 'CANCELLED', 'PENDING', 'EXPIRED') NOT NULL DEFAULT 'PENDING', \`snapshots\` json NOT NULL, INDEX \`IDX_bfd91f86461c497971a5d27bd2\` (\`deleted_at\`), INDEX \`IDX_b175a6c82b2cdb795a7583b5fa\` (\`seat_id\`, \`movie_schedule_id\`), INDEX \`IDX_b88ba5cdf040ed77f387e69b45\` (\`order_id\`, \`movie_schedule_id\`), INDEX \`IDX_1c385103935dd0007b77467b2c\` (\`movie_schedule_id\`), INDEX \`IDX_145532db85752b29c57d2b7b1f\` (\`order_id\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`orders\` (\`id\` bigint NOT NULL AUTO_INCREMENT, \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`deleted_at\` datetime(6) NULL, \`user_id\` bigint NOT NULL, \`payment_method\` enum ('CASH', 'DEBIT', 'CREDIT') NOT NULL, \`total_item_price\` decimal(10,2) NOT NULL, \`status\` enum ('PENDING', 'PAID', 'EXPIRED', 'FAILED', 'CANCELLED') NOT NULL DEFAULT 'PENDING', \`orderNumber\` varchar(100) NOT NULL, \`expires_at\` datetime NOT NULL, \`paid_at\` datetime NULL, INDEX \`IDX_09b0a39ef7c0b162f6a2f3c860\` (\`deleted_at\`), INDEX \`IDX_952f070ca31b95def7ecfcdb89\` (\`paid_at\`), INDEX \`IDX_d824fdda499dfe405678ec8ef9\` (\`status\`, \`expires_at\`), INDEX \`IDX_cb77bc746d4e7b50c722fb2151\` (\`user_id\`, \`status\`), INDEX \`IDX_d39dd89d89fe12aa86872b7865\` (\`created_at\`, \`status\`), INDEX \`IDX_d5630ca8f6ad3c8ccd748aa2e6\` (\`expires_at\`), INDEX \`IDX_775c9f06fc27ae3ff8fb26f2c4\` (\`status\`), INDEX \`IDX_a922b820eeef29ac1c6800e826\` (\`user_id\`), UNIQUE INDEX \`IDX_59b0c3b34ea0fa5562342f2414\` (\`orderNumber\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`CREATE TABLE \`users\` (\`id\` bigint NOT NULL AUTO_INCREMENT, \`created_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updated_at\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6), \`deleted_at\` datetime(6) NULL, \`name\` varchar(255) NOT NULL, \`email\` varchar(255) NOT NULL, \`password\` varchar(255) NOT NULL, \`avatar\` varchar(255) NULL, \`is_admin\` tinyint NOT NULL DEFAULT 0, \`last_login_at\` timestamp NULL, INDEX \`IDX_073999dfec9d14522f0cf58cd6\` (\`deleted_at\`), INDEX \`IDX_c9b5b525a96ddc2c5647d7f7fa\` (\`created_at\`), INDEX \`IDX_1b7c676ffb354a9cabc87b7da9\` (\`is_admin\`), UNIQUE INDEX \`IDX_97672ac88f789774dd47f7c8be\` (\`email\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`ALTER TABLE \`tokens\` ADD CONSTRAINT \`FK_8769073e38c365f315426554ca5\` FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`movie_tags\` ADD CONSTRAINT \`FK_da8c59e083499f43b357ec2ed4c\` FOREIGN KEY (\`movie_id\`) REFERENCES \`movies\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`movie_tags\` ADD CONSTRAINT \`FK_f4972e5ac13766ce20ac081cf10\` FOREIGN KEY (\`tag_id\`) REFERENCES \`tags\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`movie_schedules\` ADD CONSTRAINT \`FK_1bc9ff80ec0964c8550025acaf7\` FOREIGN KEY (\`movie_id\`) REFERENCES \`movies\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`movie_schedules\` ADD CONSTRAINT \`FK_e5631fdeeee0b9cbf449b459e39\` FOREIGN KEY (\`studio_id\`) REFERENCES \`studios\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`seats\` ADD CONSTRAINT \`FK_e4db7251af52d275aa58d9d2271\` FOREIGN KEY (\`studio_id\`) REFERENCES \`studios\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`order_items\` ADD CONSTRAINT \`FK_145532db85752b29c57d2b7b1f1\` FOREIGN KEY (\`order_id\`) REFERENCES \`orders\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`order_items\` ADD CONSTRAINT \`FK_1c385103935dd0007b77467b2cc\` FOREIGN KEY (\`movie_schedule_id\`) REFERENCES \`movie_schedules\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`order_items\` ADD CONSTRAINT \`FK_83dd681474356f119850ace04a8\` FOREIGN KEY (\`seat_id\`) REFERENCES \`seats\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE \`orders\` ADD CONSTRAINT \`FK_a922b820eeef29ac1c6800e826a\` FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`orders\` DROP FOREIGN KEY \`FK_a922b820eeef29ac1c6800e826a\``);
        await queryRunner.query(`ALTER TABLE \`order_items\` DROP FOREIGN KEY \`FK_83dd681474356f119850ace04a8\``);
        await queryRunner.query(`ALTER TABLE \`order_items\` DROP FOREIGN KEY \`FK_1c385103935dd0007b77467b2cc\``);
        await queryRunner.query(`ALTER TABLE \`order_items\` DROP FOREIGN KEY \`FK_145532db85752b29c57d2b7b1f1\``);
        await queryRunner.query(`ALTER TABLE \`seats\` DROP FOREIGN KEY \`FK_e4db7251af52d275aa58d9d2271\``);
        await queryRunner.query(`ALTER TABLE \`movie_schedules\` DROP FOREIGN KEY \`FK_e5631fdeeee0b9cbf449b459e39\``);
        await queryRunner.query(`ALTER TABLE \`movie_schedules\` DROP FOREIGN KEY \`FK_1bc9ff80ec0964c8550025acaf7\``);
        await queryRunner.query(`ALTER TABLE \`movie_tags\` DROP FOREIGN KEY \`FK_f4972e5ac13766ce20ac081cf10\``);
        await queryRunner.query(`ALTER TABLE \`movie_tags\` DROP FOREIGN KEY \`FK_da8c59e083499f43b357ec2ed4c\``);
        await queryRunner.query(`ALTER TABLE \`tokens\` DROP FOREIGN KEY \`FK_8769073e38c365f315426554ca5\``);
        await queryRunner.query(`DROP INDEX \`IDX_97672ac88f789774dd47f7c8be\` ON \`users\``);
        await queryRunner.query(`DROP INDEX \`IDX_1b7c676ffb354a9cabc87b7da9\` ON \`users\``);
        await queryRunner.query(`DROP INDEX \`IDX_c9b5b525a96ddc2c5647d7f7fa\` ON \`users\``);
        await queryRunner.query(`DROP INDEX \`IDX_073999dfec9d14522f0cf58cd6\` ON \`users\``);
        await queryRunner.query(`DROP TABLE \`users\``);
        await queryRunner.query(`DROP INDEX \`IDX_59b0c3b34ea0fa5562342f2414\` ON \`orders\``);
        await queryRunner.query(`DROP INDEX \`IDX_a922b820eeef29ac1c6800e826\` ON \`orders\``);
        await queryRunner.query(`DROP INDEX \`IDX_775c9f06fc27ae3ff8fb26f2c4\` ON \`orders\``);
        await queryRunner.query(`DROP INDEX \`IDX_d5630ca8f6ad3c8ccd748aa2e6\` ON \`orders\``);
        await queryRunner.query(`DROP INDEX \`IDX_d39dd89d89fe12aa86872b7865\` ON \`orders\``);
        await queryRunner.query(`DROP INDEX \`IDX_cb77bc746d4e7b50c722fb2151\` ON \`orders\``);
        await queryRunner.query(`DROP INDEX \`IDX_d824fdda499dfe405678ec8ef9\` ON \`orders\``);
        await queryRunner.query(`DROP INDEX \`IDX_952f070ca31b95def7ecfcdb89\` ON \`orders\``);
        await queryRunner.query(`DROP INDEX \`IDX_09b0a39ef7c0b162f6a2f3c860\` ON \`orders\``);
        await queryRunner.query(`DROP TABLE \`orders\``);
        await queryRunner.query(`DROP INDEX \`IDX_145532db85752b29c57d2b7b1f\` ON \`order_items\``);
        await queryRunner.query(`DROP INDEX \`IDX_1c385103935dd0007b77467b2c\` ON \`order_items\``);
        await queryRunner.query(`DROP INDEX \`IDX_b88ba5cdf040ed77f387e69b45\` ON \`order_items\``);
        await queryRunner.query(`DROP INDEX \`IDX_b175a6c82b2cdb795a7583b5fa\` ON \`order_items\``);
        await queryRunner.query(`DROP INDEX \`IDX_bfd91f86461c497971a5d27bd2\` ON \`order_items\``);
        await queryRunner.query(`DROP TABLE \`order_items\``);
        await queryRunner.query(`DROP INDEX \`IDX_59d2dba05c887c4be783b7eda1\` ON \`seats\``);
        await queryRunner.query(`DROP INDEX \`IDX_ee1339afeb408d5dce8bba70c3\` ON \`seats\``);
        await queryRunner.query(`DROP TABLE \`seats\``);
        await queryRunner.query(`DROP INDEX \`IDX_4906863a753ecb7d6078c927c5\` ON \`studios\``);
        await queryRunner.query(`DROP INDEX \`IDX_a9bc538fc36392150e98b5ae53\` ON \`studios\``);
        await queryRunner.query(`DROP INDEX \`IDX_4b1c6f3b3d3a9af0d48d63cc04\` ON \`studios\``);
        await queryRunner.query(`DROP INDEX \`IDX_b81763fbd16e9d4c0720551386\` ON \`studios\``);
        await queryRunner.query(`DROP INDEX \`IDX_b175c4bb74ac451432773dcca9\` ON \`studios\``);
        await queryRunner.query(`DROP TABLE \`studios\``);
        await queryRunner.query(`DROP INDEX \`IDX_ba34a2c1515e9085d6892f0bf9\` ON \`movie_schedules\``);
        await queryRunner.query(`DROP INDEX \`IDX_8c1f23566c3f20222e06828464\` ON \`movie_schedules\``);
        await queryRunner.query(`DROP INDEX \`IDX_b240977f8408c2e8cf002a3756\` ON \`movie_schedules\``);
        await queryRunner.query(`DROP INDEX \`IDX_75e2562edb5945a4bccb62e5f8\` ON \`movie_schedules\``);
        await queryRunner.query(`DROP INDEX \`IDX_16f279666937c413f204245108\` ON \`movie_schedules\``);
        await queryRunner.query(`DROP INDEX \`IDX_65b48de1e22f968da83d107651\` ON \`movie_schedules\``);
        await queryRunner.query(`DROP INDEX \`IDX_548038e544d52388b6bc133b6d\` ON \`movie_schedules\``);
        await queryRunner.query(`DROP INDEX \`IDX_50de393904101efe8146a564b2\` ON \`movie_schedules\``);
        await queryRunner.query(`DROP INDEX \`IDX_37a893512ee94638d5fcd02cb9\` ON \`movie_schedules\``);
        await queryRunner.query(`DROP INDEX \`IDX_310f5e3ba92f4b7d4d909f8de5\` ON \`movie_schedules\``);
        await queryRunner.query(`DROP TABLE \`movie_schedules\``);
        await queryRunner.query(`DROP INDEX \`IDX_a30f596bb8c7b8213cec64c512\` ON \`movies\``);
        await queryRunner.query(`DROP INDEX \`IDX_5aa0bbd146c0082d3fc5a0ad5d\` ON \`movies\``);
        await queryRunner.query(`DROP INDEX \`IDX_0171a843834c9ee0a216f2ba61\` ON \`movies\``);
        await queryRunner.query(`DROP INDEX \`IDX_5a94fb9eee9eefad549b336f96\` ON \`movies\``);
        await queryRunner.query(`DROP INDEX \`IDX_098e37ee45c050385611f9e28c\` ON \`movies\``);
        await queryRunner.query(`DROP INDEX \`IDX_761000fb255097da07de759f45\` ON \`movies\``);
        await queryRunner.query(`DROP INDEX \`IDX_ea8b01c4ec9b4594db88656222\` ON \`movies\``);
        await queryRunner.query(`DROP INDEX \`IDX_432cbfcfa3769309747e6072f0\` ON \`movies\``);
        await queryRunner.query(`DROP TABLE \`movies\``);
        await queryRunner.query(`DROP INDEX \`IDX_ca891d83e843801d3be4591af4\` ON \`movie_tags\``);
        await queryRunner.query(`DROP INDEX \`IDX_da8c59e083499f43b357ec2ed4\` ON \`movie_tags\``);
        await queryRunner.query(`DROP INDEX \`IDX_f4972e5ac13766ce20ac081cf1\` ON \`movie_tags\``);
        await queryRunner.query(`DROP INDEX \`IDX_edec4ee1b60017635ffe619a3f\` ON \`movie_tags\``);
        await queryRunner.query(`DROP INDEX \`IDX_24a395dfca2e17ce2c3aebc424\` ON \`movie_tags\``);
        await queryRunner.query(`DROP INDEX \`IDX_6011c473fd903327af4f1379c2\` ON \`movie_tags\``);
        await queryRunner.query(`DROP TABLE \`movie_tags\``);
        await queryRunner.query(`DROP INDEX \`IDX_b3aa10c29ea4e61a830362bd25\` ON \`tags\``);
        await queryRunner.query(`DROP INDEX \`IDX_d90243459a697eadb8ad56e909\` ON \`tags\``);
        await queryRunner.query(`DROP INDEX \`IDX_82767dce98ac6be7db948628f9\` ON \`tags\``);
        await queryRunner.query(`DROP INDEX \`IDX_6dae7c00326ec8ea5bdc9081eb\` ON \`tags\``);
        await queryRunner.query(`DROP INDEX \`IDX_adfb05f40f5e8cdd9151ec9b53\` ON \`tags\``);
        await queryRunner.query(`DROP TABLE \`tags\``);
        await queryRunner.query(`DROP INDEX \`IDX_8769073e38c365f315426554ca\` ON \`tokens\``);
        await queryRunner.query(`DROP INDEX \`IDX_2703ec1fbf4d8eecbef80cf6c3\` ON \`tokens\``);
        await queryRunner.query(`DROP INDEX \`IDX_989478f994a58e1a3b8b9b35a0\` ON \`tokens\``);
        await queryRunner.query(`DROP INDEX \`IDX_c1973358a8590e9ae0b98f798f\` ON \`tokens\``);
        await queryRunner.query(`DROP TABLE \`tokens\``);
    }

}
