/* globals __ROOT Tools Platform DBTypes*/
var Parent = 
  {
    Name: 'Units',
    Cube: 'Goods',
    Type: 'Catalogs',
    Alias: 'Parent'
  };

var Definition = 
  {
    Name: 'Units',
    Cube: 'Goods',
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
      Symbol:      DBTypes.STRING(10),
      ISOCode:     DBTypes.STRING(2)
    },
    Config: {
      timestamps: false
    },
    Associations: {
      BelongsTo: [Parent]
    }
  };
  
  module.exports = Definition;