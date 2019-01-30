/* globals __ROOT Tools Platform DBTypes*/
var Countries = 
  {
    Name: 'Countries',
    Cube: 'Main',
    Type: 'Catalogs',
    Alias: 'Country'
  };

var Parent = 
  {
    Name: 'PartnerAddresses',
    Cube: 'Business',
    Type: 'Catalogs',
    Alias: 'Parent'
  };

var Definition = 
  {
    Name: 'PartnerAddresses',
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
      Address1:    DBTypes.STRING(255),
      Address2:    DBTypes.STRING(255),
      PostalCode:  DBTypes.STRING(15)
    },
    Config: {
      timestamps: false
    },
    Associations: {
      BelongsTo: [Parent, Countries]
    }
  };
  
  module.exports = Definition;