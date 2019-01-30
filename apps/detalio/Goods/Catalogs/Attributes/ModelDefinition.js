/* globals __ROOT Tools Platform DBTypes*/

var Values = 
  {
    Name: 'Values',
    Cube: 'Goods',
    Type: 'Collections',
    Owner:  {
      Name: 'Attributes',
      Cube: 'Goods',
      Type: 'Catalogs'

    },
    Attributes: {
      id: {
        type:         DBTypes.UUID,
        defaultValue: DBTypes.UUIDV4,
        primaryKey:   true,
        unique:       true
      },
      rowNumber: DBTypes.INTEGER,
      Value: DBTypes.STRING
    },
    Config: {
      timestamps: false
    }
  };

  var Parent = 
  {
    Name: 'Attributes',
    Cube: 'Goods',
    Type: 'Catalogs',
    Alias: 'Parent'
  };

var Definition = 
  {
    Name: 'Attributes',
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
      IsColor:    {type: DBTypes.BOOLEAN, defaultValue: false}
    },
    Config: {
      timestamps: false
    },
    Associations: {
      BelongsTo: [Parent],
      HasMany: [Values]
    }
  };
  
  module.exports = Definition;