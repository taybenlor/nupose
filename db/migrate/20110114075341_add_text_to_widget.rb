class AddTextToWidget < ActiveRecord::Migration
  def self.up
    add_column :widgets, :text, :text
  end

  def self.down
    remove_column :widgets, :text
  end
end
