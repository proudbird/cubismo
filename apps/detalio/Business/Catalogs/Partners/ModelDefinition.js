/* globals __ROOT Tools Platform DBTypes*/
var LegalAdress = 
  {
    Name: 'PartnerAddresses',
    Cube: 'Business',
    Type: 'Catalogs',
    Alias: 'LegalAddress'
  };

  var PostalAddress = 
  {
    Name: 'PartnerAddresses',
    Cube: 'Business',
    Type: 'Catalogs',
    Alias: 'PostalAddress'
  };  

var Parent = 
  {
    Name: 'Partners',
    Cube: 'Business',
    Type: 'Catalogs',
    Alias: 'Parent'
  };

var Definition = 
  {
    Name: 'Partners',
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
      FullName:    DBTypes.STRING(255)
    },
    Config: {
      timestamps: false
    },
    Associations: {
      BelongsTo: [Parent, LegalAdress, PostalAddress]
    }
  };
  
  module.exports = Definition;