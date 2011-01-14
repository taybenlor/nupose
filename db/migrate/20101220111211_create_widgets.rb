class CreateWidgets < ActiveRecord::Migration
  def self.up
    create_table :widgets do |t|
      t.integer :poster_id
      t.string :type
      t.text :style
      t.text :data
      t.integer :version
      t.integer :width
      t.integer :height
      t.integer :left
      t.integer :top
      t.string :address
      t.string :track_id
      t.string :url

      t.timestamps
    end
  end

  def self.down
    drop_table :widgets
  end
end
