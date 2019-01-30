/* globals __ROOT Tools Platform DBTypes*/
var Coutries = 
  {
    Name: 'Countries',
    Cube: 'Main',
    Type: 'Catalogs',
    Alias: 'Country'
  };

  var Parent = 
  {
    Name: 'Producers',
    Cube: 'Goods',
    Type: 'Catalogs',
    Alias: 'Parent'
  };

var Definition = 
  {
    Name: 'Producers',
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
      Name:       DBTypes.STRING(150),
      Address:    DBTypes.STRING(255)
    },
    Config: {
      timestamps: false
    },
    Associations: {
      BelongsTo: [Parent, Coutries]
    }
  };
  
  module.exports = Definition;