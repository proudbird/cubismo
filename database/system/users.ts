import { Sequelize, DataTypes, ModelCtor, Model, FindOptions } from "sequelize";
import bcrypt from "bcryptjs";

export const config = {
  modelName: '_users',
  attributes: {
    id: {
      type        : DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey  : true,
      unique      : true
    },
    name: {
      type: DataTypes.STRING(50),
      allowNull: false
    },
    login: {
      type: DataTypes.STRING(25),
      allowNull: false,
      unique: true
    },
    email: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true
    },
    password: {
      type: DataTypes.TEXT,
      allowNull: false
    }
  }
};

export class Users {

  #model: ModelCtor<Model>;

  constructor(connection: Sequelize) {
    const model = connection.models['_users'];// as ModelCtor<Model>;
    this.#model = model;

    (model as any).build = function (values, options) {
      const record = new (model as any)(values, options);
      const self =  new User(model, record);
      return self;    
    }
  }

  ['new'](): User {
    return (this.#model.build() as unknown as User);
  } 

  async findOne(options: FindOptions): Promise<User> {
    return this.#model.findOne(options) as unknown as User;
  }

  async findAll(options: FindOptions): Promise<User[]> {
    return this.#model.findAll(options)  as unknown as User[];
  }
}

class User {

  #model    : ModelCtor<Model>
  #record   : any

  constructor(model: ModelCtor<Model>, record: Model) {
    this.#model = model;
    this.#record = record;
  }

  get id(): string {
    return this.#record.id;
  }

  get name(): string {
    return this.#record.name;
  }

  set name(value: string) {
    this.#record.name = value;
  } 

  get login(): string {
    return this.#record.login;
  }

  set email(value: string) {
    this.#record.email = value;
  }

  get email(): string {
    return this.#record.email;
  }

  set login(value: string) {
    this.#record.login = value;
  }

  set password(value: string) {
    this.#record.password = bcrypt.hashSync(value, 10);
  }


  testPassword(value: string): boolean {

    return bcrypt.compareSync(value, this.#record.password);
  }

  save(): Promise<User> {
    this.#record.save();
    return Promise.resolve(this);
  }
}