import { Sequelize, Options, DataTypes } from "sequelize";

export default class Database {

  connection: Sequelize;

  constructor(options: Options) {
    
    options.logging = options.logging || false;
    //@ts-ignore
    options.charset = options.charset || 'utf8';
    //@ts-ignore
    options.collate = options.collate || 'utf8_unicode_ci';
    
    this.connection = new Sequelize(options);
    
    const applications = this.connection.define('applications', {
      name: {
        type: DataTypes.STRING,
        allowNull: false
      },
      workspace: DataTypes.STRING,
      defaultLang: DataTypes.STRING
    });

    const connections = this.connection.define('connections', {
      dialect: {
        type: DataTypes.STRING,
        allowNull: true
      },
      host: {
        type: DataTypes.STRING,
        allowNull: true
      },
      port: {
        type: DataTypes.INTEGER,
        allowNull: true
      },
      database: {
        type: DataTypes.STRING,
        allowNull: true
      },
      storage: {
        type: DataTypes.STRING,
        allowNull: true
      },
      username: {
        type: DataTypes.STRING,
        allowNull: true
      },
      password: {
        type: DataTypes.STRING,
        allowNull: true
      },
      ssl: {
        type: DataTypes.BOOLEAN,
        allowNull: true
      }
    });

    const cubes = this.connection.define('cubes', {
      name: {
        type: DataTypes.STRING,
        allowNull: false
      }
    });

    applications.hasOne(connections);
    applications.hasMany(cubes);
  }

  async init(): Promise<void> {
    await this.connection.sync();
  }
}