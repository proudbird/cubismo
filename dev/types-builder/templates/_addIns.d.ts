declare class AddIns {

  static OneC: AddIns.OneC;
  static Mail: AddIns.Mail;
}

declare namespace AddIns {
  
  /**
   * Default class that is used to convert values and objects to 1C:Enterprise
   * internal format string and vice versa - from 1C:Enterprise internal 
   * format string to a JS value or object
   */
  interface OneC {

    bodyParserFrom1C(req, res, next): void;

    connect(conf: OneC.ConnectionConfiguration): Promise<any>;
    /**
     * @static Converts a 1C:Enterprise internal format string to a value or an object
     */
    convertFrom1C(sourceString: string): Object;

    /**
     * @static Converts a value or an object to the 1C:Enterprise internal format string
     */
    convertTo1C(item: string | number | boolean | null | Date | Array < any > | OneC.Reference | OneC.ValueList | OneC.ValueTable): string;
  }

  module OneC {

    type ConnectionConfiguration = {

      ProgID: string,
      File ? : string,
      Srvr ? : string,
      Ref ? : string,
      Usr ? : string,
      Pwd ? : string
    }

  
    /**
     * Special object to represent a reference to a Metadata object
     * inside 1C:Enterprise application
     */
     interface Reference {
      meteDataObjectId: string;
      dataBaseTableId: number;
      linkId: string;
      referenceId: string;
 
    }
  
    /**
     * Value list is an object that represents 1C:Enterprise analogue of Values list. 
     * Contains a collection of {@link ValueTableItem} objects and can be iterated through
     * all the items and every item can be getten by index.
     */
     interface ValueList {
      [index: number]: ValueListItem;
      length: number;
    }
  
    /**
     * Represents 1C:Enterprise analogue of Values list item. 
     * Can be created only by using {@link ValueList.add} method.
     */
     interface ValueListItem {
      /**
       * Any value or an object, that can be converted to/from 
       * 1C:Enterprise internal format string
       */
      value: string;
  
      /**
       * Titel for the value
       */
      representation: string | undefined;
  
      /**
       * Means whether a value is marked/checked or not
       */
      marked: boolean;

    }
  
    /**
     * Value table is an object that represents 1C:Enterprise analogue of Values table. 
     * Contains a collection of {@link ValueTableColumn} objects and can be iterated through
     * all the records and every record (row) can be getten by index. Records (rows) are 
     * the objects of type {@link ValueTableRow}.
     */
     interface ValueTable {
  
      [index: number]: ValueTableRow < any > ;
  
      /**
       * How many items a ValueTable has
       */
      length: number;
  
      /**
       * A collection of columns
       */
      columns: ValueTableColumnCollection < ValueTableColumn > ;
    }
  
    /**
     * Collection of {@link ValueTableColumn} objects
     * * Can be iterated through all the columns and every column can be gotten by index.
     */
     interface ValueTableColumnCollection < ValueTableColumn > {
  
      [index: number]: ValueTableRow < any > ;
  
      /**
       * How many columns collection has
       */
      length: number;
    }
  
    /**
     * A ValueTable column. Can be created and added only by using 
     * {@link ValueTableColumn.add} method
     */
     interface ValueTableColumn {
  
      /**
       * Name of the column
       */
      name: string;
  
      /**
       * Type of the column
       */
      type: OneCAddIn.DataTypes;
    }
  
    /**
     * ValueTable row/record. Can be created and added only by using
     * {@link ValueTable.addRow} method.
     */
     interface ValueTableRow < T > {
  
      [key: string]: T
    }
  }

  interface Mail {

    postman(options: MailAddIn.MailTransporterOptions): MailAddIn.Postman;
  }
}

declare namespace OneCAddIn {

  type ConnectionConfiguration = {

    ProgID: string,
    File ? : string,
    Srvr ? : string,
    Ref ? : string,
    Usr ? : string,
    Pwd ? : string
  }

  /**
   * Default class that is used to convert values and objects to 1C:Enterprise
   * internal format string and vice versa - from 1C:Enterprise internal 
   * format string to a JS value or object
   */
  class Converter {

    /**
     * @static Converts a 1C:Enterprise internal format string to a value or an object
     */
    static convertFrom1C(sourceString: string): Object;

    /**
     * @static Converts a value or an object to the 1C:Enterprise internal format string
     */
    static convertTo1C(item: string | number | boolean | null | Date | Array < any > | IReference | IValueList | IValueTable): string;
  }

  enum DataTypes {
    String = 'S',
      Number = 'N',
      Boolean = 'B',
      Date = 'D',
      Null = 'L',
      Reference = '#'
  }

  interface IReference {
    meteDataObjectId: string;
    dataBaseTableId: number;
    linkId: string;
  }

  /**
   * Special object to represent a reference to a Metadata object
   * inside 1C:Enterprise application
   */
  class Reference implements IReference {
    meteDataObjectId: string;
    dataBaseTableId: number;
    linkId: string;
    referenceId: string;
    /**
     * Create a reference
     * @param {string} meteDataObjectId A GUID of a Metadata object inside 1C:Enterprise application
     * @param {number} dataBaseTableId A number of a table in 1C:Enterprise database
     * @param {string} linkId An internal identificator of a reference inside 1C:Enterprise application
     */
    constructor(
      meteDataObjectId: string,
      dataBaseTableId: number,
      linkId: string
    );
  }

  interface IValueList {
    [index: number]: IValueListItem;
    length: number;
  }

  interface IValueListItem {
    value: string;
    representation: string | undefined;
    marked: boolean;
  }

  /**
   * Value list is an object that represents 1C:Enterprise analogue of Values list. 
   * Contains a collection of {@link ValueTableItem} objects and can be iterated through
   * all the items and every item can be getten by index.
   */
  class ValueList implements IValueList {
    [index: number]: ValueListItem;
    length: number;

    /**
     * Add a new item to the list
     * @param {any} value Any value or an object, that can be converted to 
     * 1C:Enterprise internal format string
     * @param {string} [representation] A titel for the value
     * @param {boolean} [marked] Whether a value is marked/checked or not
     * @returns {ValueListItem} Added item
     */
    add(value: any, representation ? : string, marked ? : boolean): ValueListItem
  }

  /**
   * Represents 1C:Enterprise analogue of Values list item. 
   * Can be created only by using {@link ValueList.add} method.
   */
  class ValueListItem implements IValueListItem {
    /**
     * Any value or an object, that can be converted to/from 
     * 1C:Enterprise internal format string
     */
    value: string;

    /**
     * Titel for the value
     */
    representation: string | undefined;

    /**
     * Means whether a value is marked/checked or not
     */
    marked: boolean;

    constructor(value: any, representation: string | undefined, marked: boolean);
  }

  interface IValueTableRow < T > {
    [key: string]: T
  }

  interface IValueTableColumn {
    name: string;
  }

  interface IValueTableColumnCollection < IValueTableColumn > {
    [index: number]: IValueTableRow < any > ;
    length: number;
  }

  interface IValueTable {
    [index: number]: IValueTableRow < any > ;
    length: number;
    columns: IValueTableColumnCollection < IValueTableColumn > ;
  }

  /**
   * Value table is an object that represents 1C:Enterprise analogue of Values table. 
   * Contains a collection of {@link ValueTableColumn} objects and can be iterated through
   * all the records and every record (row) can be getten by index. Records (rows) are 
   * the objects of type {@link ValueTableRow}.
   */
  class ValueTable implements IValueTable {

    [index: number]: ValueTableRow < any > ;

    /**
     * How many items a ValueTable has
     */
    public length: number;

    /**
     * A collection of columns
     */
    public columns: ValueTableColumnCollection < ValueTableColumn > ;

    /**
     * Add a new row to the table. If the method is called with `value` parameter,
     * a new row will be filled with properties' values of that parameter and only,
     * if its properties's names are the same as columns names
     * @param {any} value An object with properties' names the same as columns' names
     * @returns {ValueTableRow} Added row
     */
    public addRow(value ? : any): ValueTableRow < any > ;
  }

  /**
   * Collection of {@link ValueTableColumn} objects
   * * Can be iterated through all the columns and every column can be gotten by index.
   */
  class ValueTableColumnCollection < ValueTableColumn > implements IValueTableColumnCollection < IValueTableColumn > {

    [index: number]: ValueTableRow < any > ;

    /**
     * How many columns collection has
     */
    public length: number;

    /**
     * Add a new column to the table
     * @param {string} name A column's name
     * @param {DataTypes} [type] A column type
     * @returns {ValueTableColumn} Added column
     */
    public add(name: string, type ? : DataTypes | undefined): ValueTableColumn;
  }

  /**
   * A ValueTable column. Can be created and added only by using 
   * {@link ValueTableColumn.add} method
   */
  class ValueTableColumn implements IValueTableColumn {

    /**
     * Name of the column
     */
    public name: string;

    /**
     * Type of the column
     */
    public type: DataTypes;
  }

  /**
   * ValueTable row/record. Can be created and added only by using
   * {@link ValueTable.addRow} method.
   */
  class ValueTableRow < T > implements IValueTableRow < T > {

    [key: string]: T
  }
}

declare namespace MailAddIn {

  class Postman {
    send(mail: MailData): Promise<SentMailInfo>
  }

  type MailTransporterOptions = {
    pool?: boolean,
    host: string,
    port: number,
    secure: boolean,
    auth: {
      user: string,
      pass: string,
    },
    tls?: {
      rejectUnauthorized?: boolean,
    }
  }
  
  type SentMailInfo = {
    envelope: string,
    messageId: string
  }
  
  type MailData = {
    from: string,
    to: string,
    subject?: string,
    text?: string,
    html?: string
  }
}