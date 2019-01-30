/* globals __ROOT Tools Platform DBTypes*/
var Partner = 
{
  Name: 'Partners',
  Cube: 'Business',
  Type: 'Catalogs',
  Alias: 'Partner'
};

var Parent = 
  {
    Name: 'Agreements',
    Cube: 'Business',
    Type: 'Catalogs',
    Alias: 'Parent'
  };

var Definition = 
  {
    Name: 'Agreements',
    Cube: 'Business',
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
      Number:      DBTypes.STRING(25),
      Date:        DBTypes.DATE
    },
    Config: {
      timestamps: false
    },
    Associations: {
      BelongsTo: [Parent, Partner]
    }
  };
  
  module.exports = Definition;