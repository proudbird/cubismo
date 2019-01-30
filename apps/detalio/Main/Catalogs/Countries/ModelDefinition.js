/* globals __ROOT Tools Platform DBTypes*/
var Parent = 
  {
    Name: 'Variations',
    Cube: 'Goods',
    Type: 'Catalogs',
    Alias: 'Parent'
  };

var Definition = 
  {
    Name: 'Countries',
    Cube: 'Main',
    Type: 'Catalogs',
    Attributes: {
      id: {
          type:         DBTypes.UUID,
          defaultValue: DBTypes.UUIDV4,
          primaryKey:   true,
          unique:       true
        },
      Deleted:   {type: DBTypes.BOOLEAN, defaultValue: false},
      Code: {
          type:          DBTypes.INTEGER,
          autoIncrement: true,
          unique:        true
        },
      IsFolder:   {type: DBTypes.BOOLEAN, defaultValue: false},
      Name:        DBTypes.STRING(25),
      Alpha2:      DBTypes.STRING(2),
      Alpha3:      DBTypes.STRING(3)
    },
    Config: {
      timestamps: false
    },
    Associations: {
      BelongsTo: [Parent]
    }
  };
  
  module.exports = Definition;